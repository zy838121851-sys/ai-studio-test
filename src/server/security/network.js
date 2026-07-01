import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { createHttpError } from "../lib/input-validation.js";

const PRIVATE_IPV4_RANGES = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["127.0.0.0", 8],
  ["100.64.0.0", 10],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
];

function ipv4ToNumber(ip) {
  return ip.split(".").reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function ipv4InRange(ip, [base, bits]) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

function isBlockedIp(address = "") {
  const clean = String(address || "").replace(/^::ffff:/, "");
  const version = isIP(clean);
  if (version === 4) return PRIVATE_IPV4_RANGES.some((range) => ipv4InRange(clean, range));
  if (version === 6) {
    const lower = clean.toLowerCase();
    return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
  }
  return false;
}

export async function assertPublicHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw createHttpError("Invalid image URL", 400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw createHttpError("Invalid image URL", 400);
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    throw createHttpError("Unsupported image URL", 400);
  }

  if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost")) {
    throw createHttpError("Private image URLs are not allowed", 400);
  }

  const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw createHttpError("Private image URLs are not allowed", 400);
  }

  return parsed.toString();
}
