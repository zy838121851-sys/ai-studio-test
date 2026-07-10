import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Res,
  UseGuards
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { SessionDto, VerificationCodeDto } from "@ai-studio/contracts";
import type { AuthContext } from "@ai-studio/server-core";
import type { FastifyReply } from "fastify";

import { PlatformService } from "../platform.service.js";
import { CurrentAuth, SESSION_COOKIE_NAME, SessionAuthGuard } from "./auth-context.js";
import { LoginDto, RegisterDto, SendVerificationCodeDto } from "./auth.dto.js";

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Post("verification-code")
  @ApiBody({ type: SendVerificationCodeDto })
  @ApiOperation({ summary: "Send a registration verification code" })
  sendVerificationCode(@Body() body: SendVerificationCodeDto): Promise<VerificationCodeDto> {
    return this.platform.identity.issueVerificationCode(body.email);
  }

  @Post("register")
  @ApiBody({ type: RegisterDto })
  @ApiOperation({ summary: "Register a fresh rewrite account" })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<SessionDto> {
    const result = await this.platform.identity.register(body);
    this.setSessionCookie(reply, result.token);
    return result.session;
  }

  @Post("login")
  @ApiBody({ type: LoginDto })
  @ApiOperation({ summary: "Log in with email and password" })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<SessionDto> {
    const result = await this.platform.identity.login(body.email, body.password);
    this.setSessionCookie(reply, result.token);
    return result.session;
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Return the current account and credit balance" })
  getCurrentSession(@CurrentAuth() auth: AuthContext): Promise<SessionDto> {
    return this.platform.identity.getSession(auth);
  }

  @Post("logout")
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<{ loggedOut: true }> {
    await this.platform.identity.logout(auth);
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { loggedOut: true };
  }

  private setSessionCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.platform.config.nodeEnvironment === "production",
      sameSite: "lax",
      signed: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });
  }
}
