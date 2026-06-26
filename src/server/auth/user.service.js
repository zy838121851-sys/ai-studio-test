import { randomUUID } from "node:crypto";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";
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
    createdAt: row.created_at
  };
}

export function findUserByEmail(email) {
  return queryOne(`
    SELECT id, email, name, password_hash, password_salt, created_at
    FROM users
    WHERE email = ${sqlValue(normalizeEmail(email))}
    LIMIT 1;
  `);
}

export function createUser({ email, password, name = "" } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const error = new Error("Valid email is required");
    error.status = 400;
    throw error;
  }
  if (String(password || "").length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.status = 400;
    throw error;
  }
  if (findUserByEmail(normalizedEmail)) {
    const error = new Error("Email already registered");
    error.status = 409;
    throw error;
  }

  const now = Date.now();
  const { hash, salt } = hashPassword(password);
  const id = randomUUID();
  execute(`
    INSERT INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
    VALUES (
      ${sqlValue(id)},
      ${sqlValue(normalizedEmail)},
      ${sqlValue(String(name || "").trim())},
      ${sqlValue(hash)},
      ${sqlValue(salt)},
      ${now},
      ${now}
    );
  `);
  grantInitialCreditsIfAvailable(id);
  return publicUser({
    id,
    email: normalizedEmail,
    name: String(name || "").trim(),
    created_at: now
  });
}

function grantInitialCreditsIfAvailable(userId) {
  try {
    ensureCreditAccount(userId);
  } catch (error) {
    if (!/no such table: credit_accounts/i.test(error?.message || "")) throw error;
  }
}

export function authenticateUser({ email, password } = {}) {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password || "", user.password_salt, user.password_hash)) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }
  return publicUser(user);
}
