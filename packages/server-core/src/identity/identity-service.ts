import { createHash, randomBytes, randomInt } from "node:crypto";

import type {
  AuthUserDto,
  CreditBalanceDto,
  SessionDto,
  VerificationCodeDto
} from "@ai-studio/contracts";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import {
  creditAccounts,
  creditLedger,
  sessions,
  users,
  verificationCodes,
  workspaceMemberships,
  workspaces
} from "../database/schema.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { IdentityProviders } from "./identity-providers.js";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;
const VERIFICATION_DURATION_MS = 10 * 60 * 1_000;
const INITIAL_CREDITS = 200;

export interface AuthenticatedSession {
  token: string;
  session: SessionDto;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  verificationCode: string;
}

export class IdentityService {
  constructor(
    private readonly database: RewriteDatabase,
    private readonly sessionSecret: string,
    private readonly providers: IdentityProviders
  ) {}

  async issueVerificationCode(emailInput: string): Promise<VerificationCodeDto> {
    const email = normalizeEmail(emailInput);
    const code = String(randomInt(100_000, 1_000_000));
    const delivery = await this.providers.emailCode.deliver({
      target: email,
      code,
      purpose: "register"
    });

    await this.database.insert(verificationCodes).values({
      target: email,
      purpose: "register",
      codeHash: this.hashVerificationCode(email, code),
      expiresAt: new Date(Date.now() + VERIFICATION_DURATION_MS)
    });

    return {
      delivered: true,
      expiresInSeconds: VERIFICATION_DURATION_MS / 1_000,
      ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {})
    };
  }

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    const email = normalizeEmail(input.email);
    const displayName = normalizeDisplayName(input.displayName);
    const passwordHash = await hashPassword(input.password);
    const codeHash = this.hashVerificationCode(email, input.verificationCode);
    const now = new Date();

    const identity = await this.database.transaction(async (transaction) => {
      const [existingUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser) {
        throw new ApplicationError("EMAIL_ALREADY_REGISTERED", 409, "该邮箱已注册");
      }

      const [verification] = await transaction
        .select({ id: verificationCodes.id })
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.target, email),
            eq(verificationCodes.purpose, "register"),
            eq(verificationCodes.codeHash, codeHash),
            isNull(verificationCodes.consumedAt),
            gt(verificationCodes.expiresAt, now)
          )
        )
        .orderBy(desc(verificationCodes.createdAt))
        .limit(1);
      if (!verification) {
        throw new ApplicationError("INVALID_VERIFICATION_CODE", 400, "验证码无效或已过期");
      }

      const [user] = await transaction
        .insert(users)
        .values({ email, passwordHash, displayName })
        .returning({ id: users.id, email: users.email, displayName: users.displayName });
      if (!user) {
        throw new ApplicationError("REGISTRATION_FAILED", 500, "注册失败");
      }

      const [workspace] = await transaction
        .insert(workspaces)
        .values({ ownerUserId: user.id, name: `${displayName} 的工作区` })
        .returning({ id: workspaces.id, name: workspaces.name });
      if (!workspace) {
        throw new ApplicationError("REGISTRATION_FAILED", 500, "工作区创建失败");
      }

      await transaction.insert(workspaceMemberships).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner"
      });
      await transaction.insert(creditAccounts).values({
        workspaceId: workspace.id,
        balance: INITIAL_CREDITS,
        reserved: 0
      });
      await transaction.insert(creditLedger).values({
        workspaceId: workspace.id,
        entryType: "grant",
        amount: INITIAL_CREDITS,
        reservedDelta: 0,
        balanceAfter: INITIAL_CREDITS,
        reservedAfter: 0,
        idempotencyKey: `registration:${user.id}`,
        referenceType: "registration",
        referenceId: user.id,
        metadata: {}
      });
      await transaction
        .update(verificationCodes)
        .set({ consumedAt: now })
        .where(eq(verificationCodes.id, verification.id));

      return { user, workspace };
    });

    return this.createSession(identity.user, identity.workspace);
  }

  async login(emailInput: string, password: string): Promise<AuthenticatedSession> {
    const email = normalizeEmail(emailInput);
    const [identity] = await this.database
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        passwordHash: users.passwordHash,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name
      })
      .from(users)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.userId, users.id))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(and(eq(users.email, email), eq(users.status, "active")))
      .orderBy(workspaceMemberships.createdAt)
      .limit(1);

    if (!identity || !(await verifyPassword(password, identity.passwordHash))) {
      throw new ApplicationError("INVALID_CREDENTIALS", 401, "邮箱或密码错误");
    }

    return this.createSession(
      { id: identity.userId, email: identity.email, displayName: identity.displayName },
      { id: identity.workspaceId, name: identity.workspaceName }
    );
  }

  async authenticateSession(token: string | undefined): Promise<AuthContext> {
    if (!token) {
      throw new ApplicationError("UNAUTHORIZED", 401, "请先登录");
    }

    const tokenHash = hashToken(token);
    const now = new Date();
    const [session] = await this.database
      .select({
        sessionId: sessions.id,
        userId: users.id,
        workspaceId: workspaces.id,
        email: users.email,
        displayName: users.displayName,
        workspaceName: workspaces.name
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .innerJoin(workspaces, eq(workspaces.id, sessions.workspaceId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, now),
          eq(users.status, "active")
        )
      )
      .limit(1);

    if (!session) {
      throw new ApplicationError("UNAUTHORIZED", 401, "登录状态已失效");
    }

    await this.database
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.id, session.sessionId));

    return session;
  }

  async getSession(context: AuthContext): Promise<SessionDto> {
    return {
      user: toAuthUser(context),
      credits: await this.getCredits(context.workspaceId)
    };
  }

  async logout(context: AuthContext): Promise<void> {
    await this.database.delete(sessions).where(eq(sessions.id, context.sessionId));
  }

  private async createSession(
    user: { id: string; email: string; displayName: string },
    workspace: { id: string; name: string }
  ): Promise<AuthenticatedSession> {
    const token = randomBytes(32).toString("base64url");
    const [session] = await this.database
      .insert(sessions)
      .values({
        userId: user.id,
        workspaceId: workspace.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
      })
      .returning({ id: sessions.id });
    if (!session) {
      throw new ApplicationError("SESSION_CREATE_FAILED", 500, "登录状态创建失败");
    }

    const context: AuthContext = {
      sessionId: session.id,
      userId: user.id,
      workspaceId: workspace.id,
      email: user.email,
      displayName: user.displayName,
      workspaceName: workspace.name
    };

    return {
      token,
      session: {
        user: toAuthUser(context),
        credits: await this.getCredits(workspace.id)
      }
    };
  }

  private async getCredits(workspaceId: string): Promise<CreditBalanceDto> {
    const [account] = await this.database
      .select({ balance: creditAccounts.balance, reserved: creditAccounts.reserved })
      .from(creditAccounts)
      .where(eq(creditAccounts.workspaceId, workspaceId))
      .limit(1);
    if (!account) {
      throw new ApplicationError("CREDIT_ACCOUNT_NOT_FOUND", 500, "积分账户不存在");
    }

    return {
      balance: account.balance,
      reserved: account.reserved,
      available: account.balance - account.reserved
    };
  }

  private hashVerificationCode(email: string, code: string): string {
    return createHash("sha256")
      .update(`${this.sessionSecret}:${email}:${code}`)
      .digest("hex");
  }
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 320) {
    throw new ApplicationError("INVALID_EMAIL", 400, "邮箱格式不正确");
  }
  return normalized;
}

function normalizeDisplayName(displayName: string): string {
  const normalized = displayName.trim();
  if (normalized.length < 1 || normalized.length > 80) {
    throw new ApplicationError("INVALID_DISPLAY_NAME", 400, "昵称长度必须在 1 到 80 个字符之间");
  }
  return normalized;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(context: AuthContext): AuthUserDto {
  return {
    id: context.userId,
    email: context.email,
    displayName: context.displayName,
    workspaceId: context.workspaceId,
    workspaceName: context.workspaceName
  };
}
