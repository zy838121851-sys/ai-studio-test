import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";

export const SESSION_COOKIE_NAME = "ai_studio_session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) return [part, ""];
        return [
          decodeURIComponent(part.slice(0, index).trim()),
          decodeURIComponent(part.slice(index + 1).trim())
        ];
      })
  );
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS
  };
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie || "")[SESSION_COOKIE_NAME] || "";
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function createSession(userId) {
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  execute(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
    VALUES (
      ${sqlValue(randomUUID())},
      ${sqlValue(userId)},
      ${sqlValue(hashToken(token))},
      ${now},
      ${now + SESSION_MAX_AGE_MS},
      ${now}
    );
  `);
  return token;
}

export function findSessionUser(token) {
  if (!token) return null;
  const now = Date.now();
  const row = queryOne(`
    SELECT
      sessions.id AS session_id,
      sessions.expires_at AS expires_at,
      users.id AS id,
      users.email AS email,
      users.name AS name,
      users.created_at AS created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${sqlValue(hashToken(token))}
      AND sessions.expires_at > ${now}
    LIMIT 1;
  `);
  if (!row) return null;
  execute(`
    UPDATE sessions
    SET last_seen_at = ${now}
    WHERE id = ${sqlValue(row.session_id)};
  `);
  return {
    sessionId: row.session_id,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at
    }
  };
}

export function destroySession(token) {
  if (!token) return;
  execute(`
    DELETE FROM sessions
    WHERE token_hash = ${sqlValue(hashToken(token))};
  `);
}
