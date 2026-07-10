import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const normalized = validatePassword(password);
  const salt = randomBytes(16);
  const derived = (await scrypt(normalized, salt, KEY_LENGTH)) as Buffer;

  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltHex, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  if (expected.byteLength !== KEY_LENGTH) {
    return false;
  }

  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actual, expected);
}

function validatePassword(password: string): string {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Password must contain between 8 and 128 characters.");
  }

  return password;
}
