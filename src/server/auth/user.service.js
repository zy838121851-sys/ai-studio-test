import { randomUUID } from "node:crypto";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";
import { createHttpError } from "../lib/input-validation.js";
import { ensureCreditAccount } from "../services/credits/credit.service.js";
import { publicEmail } from "./identity.service.js";
import { hashPassword, verifyPassword } from "./password.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: publicEmail(row.email),
    phone: row.phone || "",
    name: row.name || "",
    avatarUrl: row.avatar_url || "",
    createdAt: row.created_at
  };
}

export function findUserByEmail(email) {
  return queryOne(`
    SELECT id, email, phone, name, avatar_url, password_hash, password_salt, created_at
    FROM users
    WHERE lower(email) = ${sqlValue(normalizeEmail(email))}
      AND deleted_at IS NULL
    LIMIT 1;
  `);
}

export function createUser({ email, password, name = "" } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw createHttpError("Valid email is required", 400);
  }
  if (String(password || "").length < 8) {
    throw createHttpError("Password must be at least 8 characters", 400);
  }
  if (findUserByEmail(normalizedEmail)) {
    throw createHttpError("Email already registered", 409);
  }

  const now = Date.now();
  const { hash, salt } = hashPassword(password);
  const id = randomUUID();
  execute(`
    INSERT INTO users (id, email, phone, name, avatar_url, password_hash, password_salt, created_at, updated_at, deleted_at)
    VALUES (
      ${sqlValue(id)},
      ${sqlValue(normalizedEmail)},
      '',
      ${sqlValue(String(name || "").trim())},
      '',
      ${sqlValue(hash)},
      ${sqlValue(salt)},
      ${now},
      ${now},
      NULL
    );

    INSERT OR IGNORE INTO user_identities (
      id,
      user_id,
      provider,
      identifier,
      display_name,
      avatar_url,
      verified_at,
      created_at,
      updated_at
    )
    VALUES (
      ${sqlValue(`email-password-${id}`)},
      ${sqlValue(id)},
      'email',
      ${sqlValue(normalizedEmail)},
      ${sqlValue(String(name || "").trim())},
      '',
      ${now},
      ${now},
      ${now}
    );
  `);
  ensureCreditAccount(id);
  return publicUser({
    id,
    email: normalizedEmail,
    phone: "",
    name: String(name || "").trim(),
    avatar_url: "",
    created_at: now
  });
}

export function authenticateUser({ email, password } = {}) {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password || "", user.password_salt, user.password_hash)) {
    throw createHttpError("Invalid email or password", 401);
  }
  return publicUser(user);
}
