import { randomUUID } from "node:crypto";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";
import { ensureCreditAccount } from "../services/credits/credit.service.js";

export const IDENTITY_PROVIDERS = new Set(["email", "phone", "wechat", "qq"]);
const INTERNAL_EMAIL_DOMAIN = "identity.local";

function internalEmail(provider, identifier) {
  const clean = String(identifier || "").replace(/[^a-zA-Z0-9_-]/g, "_") || "user";
  return `${provider}-${clean}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function publicEmail(email = "") {
  const clean = String(email || "");
  return clean.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`) ? "" : clean;
}

export function normalizeIdentity(provider, identifier) {
  const cleanProvider = String(provider || "").trim().toLowerCase();
  let cleanIdentifier = String(identifier || "").trim();
  if (cleanProvider === "email") cleanIdentifier = cleanIdentifier.toLowerCase();
  if (cleanProvider === "phone") cleanIdentifier = cleanIdentifier.replace(/[^\d+]/g, "");
  return { provider: cleanProvider, identifier: cleanIdentifier };
}

export function findIdentity(provider, identifier) {
  const clean = normalizeIdentity(provider, identifier);
  if (!IDENTITY_PROVIDERS.has(clean.provider) || !clean.identifier) return null;
  return queryOne(`
    SELECT
      user_identities.id AS identity_id,
      user_identities.provider,
      user_identities.identifier,
      user_identities.display_name,
      user_identities.avatar_url,
      user_identities.verified_at,
      users.id,
      users.email,
      users.phone,
      users.name,
      users.created_at
    FROM user_identities
    JOIN users ON users.id = user_identities.user_id
    WHERE user_identities.provider = ${sqlValue(clean.provider)}
      AND user_identities.identifier = ${sqlValue(clean.identifier)}
    LIMIT 1;
  `);
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: publicEmail(row.email),
    phone: row.phone || "",
    name: row.name || "",
    createdAt: row.created_at
  };
}

export function createUserWithIdentity({
  provider,
  identifier,
  email = "",
  phone = "",
  name = "",
  displayName = "",
  avatarUrl = ""
} = {}) {
  const clean = normalizeIdentity(provider, identifier);
  if (!IDENTITY_PROVIDERS.has(clean.provider) || !clean.identifier) {
    const error = new Error("Valid identity is required");
    error.status = 400;
    throw error;
  }
  const existing = findIdentity(clean.provider, clean.identifier);
  if (existing) return publicUser(existing);

  const now = Date.now();
  const userId = randomUUID();
  const identityId = randomUUID();
  const normalizedEmail = clean.provider === "email"
    ? clean.identifier
    : (String(email || "").trim().toLowerCase() || internalEmail(clean.provider, clean.identifier));
  const normalizedPhone = clean.provider === "phone" ? clean.identifier : String(phone || "").trim();
  const fallbackName = name || displayName || normalizedEmail || normalizedPhone || `${clean.provider} user`;

  execute(`
    INSERT INTO users (id, email, phone, name, password_hash, password_salt, created_at, updated_at)
    VALUES (
      ${sqlValue(userId)},
      ${sqlValue(normalizedEmail)},
      ${sqlValue(normalizedPhone)},
      ${sqlValue(fallbackName)},
      '',
      '',
      ${now},
      ${now}
    );

    INSERT INTO user_identities (
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
      ${sqlValue(identityId)},
      ${sqlValue(userId)},
      ${sqlValue(clean.provider)},
      ${sqlValue(clean.identifier)},
      ${sqlValue(displayName || fallbackName)},
      ${sqlValue(avatarUrl)},
      ${now},
      ${now},
      ${now}
    );
  `);
  grantInitialCreditsIfAvailable(userId);

  return {
    id: userId,
    email: normalizedEmail,
    phone: normalizedPhone,
    name: fallbackName,
    createdAt: now
  };
}

function grantInitialCreditsIfAvailable(userId) {
  try {
    ensureCreditAccount(userId);
  } catch (error) {
    if (!/no such table: credit_accounts/i.test(error?.message || "")) throw error;
  }
}

export function findOrCreateIdentityUser(input = {}) {
  const clean = normalizeIdentity(input.provider, input.identifier);
  const existing = findIdentity(clean.provider, clean.identifier);
  if (existing) return publicUser(existing);
  return createUserWithIdentity({ ...input, provider: clean.provider, identifier: clean.identifier });
}
