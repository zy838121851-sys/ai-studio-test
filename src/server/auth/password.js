import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 210000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  const hash = pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const expected = Buffer.from(expectedHash, "hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
