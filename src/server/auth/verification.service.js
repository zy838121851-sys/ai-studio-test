import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";
import { createHttpError } from "../lib/input-validation.js";
import { findOrCreateIdentityUser, normalizeIdentity } from "./identity.service.js";
import { deliverVerificationCode } from "./code-provider.service.js";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const VERIFICATION_CODE_RETENTION_MS = 24 * 60 * 60 * 1000;

function normalizeChannel(channel) {
  const clean = String(channel || "").trim().toLowerCase();
  return clean === "sms" ? "sms" : "email";
}

function normalizeTarget(channel, target) {
  if (channel === "sms") return normalizeIdentity("phone", target).identifier;
  return normalizeIdentity("email", target).identifier;
}

function hashCode(code, salt) {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function cleanupVerificationCodes(now = Date.now()) {
  execute(`
    DELETE FROM verification_codes
    WHERE (
        consumed_at IS NULL
        AND expires_at <= ${now}
      )
      OR (
        consumed_at IS NOT NULL
        AND consumed_at <= ${now - VERIFICATION_CODE_RETENTION_MS}
      );
  `);
}

export async function sendVerificationCode({ channel, target, purpose = "login" } = {}) {
  const cleanChannel = normalizeChannel(channel);
  const cleanTarget = normalizeTarget(cleanChannel, target);
  if (!cleanTarget || (cleanChannel === "email" && !cleanTarget.includes("@"))) {
    throw createHttpError(cleanChannel === "sms" ? "Valid phone number is required" : "Valid email is required", 400);
  }

  const now = Date.now();
  cleanupVerificationCodes(now);
  const existing = queryOne(`
    SELECT id, last_sent_at
    FROM verification_codes
    WHERE channel = ${sqlValue(cleanChannel)}
      AND target = ${sqlValue(cleanTarget)}
      AND purpose = ${sqlValue(purpose)}
      AND consumed_at IS NULL
      AND expires_at > ${now}
    ORDER BY created_at DESC
    LIMIT 1;
  `);
  if (existing && Number(existing.last_sent_at || 0) + RESEND_WINDOW_MS > now) {
    throw createHttpError("Please wait before requesting another code", 429);
  }

  const code = makeCode();
  const salt = randomBytes(16).toString("hex");
  execute(`
    INSERT INTO verification_codes (
      id,
      channel,
      target,
      purpose,
      code_hash,
      salt,
      expires_at,
      consumed_at,
      attempt_count,
      created_at,
      last_sent_at
    )
    VALUES (
      ${sqlValue(randomUUID())},
      ${sqlValue(cleanChannel)},
      ${sqlValue(cleanTarget)},
      ${sqlValue(purpose)},
      ${sqlValue(hashCode(code, salt))},
      ${sqlValue(salt)},
      ${now + CODE_TTL_MS},
      NULL,
      0,
      ${now},
      ${now}
    );
  `);

  const delivery = await deliverVerificationCode({
    channel: cleanChannel,
    target: cleanTarget,
    purpose,
    code
  });

  return {
    channel: cleanChannel,
    target: cleanTarget,
    purpose,
    expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
    ...delivery
  };
}

export function verifyCodeAndGetUser({ channel, target, code, name = "", purpose = "login" } = {}) {
  const cleanChannel = normalizeChannel(channel);
  const cleanTarget = normalizeTarget(cleanChannel, target);
  const cleanCode = String(code || "").trim();
  const now = Date.now();
  const row = queryOne(`
    SELECT id, code_hash, salt, attempt_count, expires_at
    FROM verification_codes
    WHERE channel = ${sqlValue(cleanChannel)}
      AND target = ${sqlValue(cleanTarget)}
      AND purpose = ${sqlValue(purpose)}
      AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
  `);

  if (!row || Number(row.expires_at || 0) <= now) {
    throw createHttpError("Verification code is invalid or expired", 400);
  }
  if (Number(row.attempt_count || 0) >= MAX_ATTEMPTS) {
    throw createHttpError("Verification code has too many attempts", 429);
  }

  const matches = hashCode(cleanCode, row.salt) === row.code_hash;
  if (!matches) {
    execute(`
      UPDATE verification_codes
      SET attempt_count = attempt_count + 1
      WHERE id = ${sqlValue(row.id)};
    `);
    throw createHttpError("Verification code is invalid or expired", 400);
  }

  execute(`
    UPDATE verification_codes
    SET consumed_at = ${now}
    WHERE id = ${sqlValue(row.id)};
  `);

  const provider = cleanChannel === "sms" ? "phone" : "email";
  return findOrCreateIdentityUser({
    provider,
    identifier: cleanTarget,
    name,
    email: provider === "email" ? cleanTarget : "",
    phone: provider === "phone" ? cleanTarget : ""
  });
}
