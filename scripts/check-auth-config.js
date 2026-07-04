import { getAuthProviderCheck } from "../src/server/auth/provider-status.service.js";

const result = getAuthProviderCheck();
const strict = process.env.NODE_ENV === "production"
  || ["1", "true", "yes", "on"].includes(String(process.env.AUTH_CONFIG_STRICT || "").trim().toLowerCase());

console.log(`auth code provider: ${result.codeProvider}`);
console.log(`auth config strict: ${strict ? "yes" : "no"}`);

for (const check of result.checks) {
  const state = check.configured ? "ok" : `missing ${check.missing.join(", ")}`;
  console.log(`${check.name} (${check.provider}): ${state}`);
}

if (!result.ok && strict) {
  process.exitCode = 1;
}
