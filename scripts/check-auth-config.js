import { getAuthProviderCheck } from "../src/server/auth/provider-status.service.js";

const result = getAuthProviderCheck();

console.log(`auth code provider: ${result.codeProvider}`);

for (const check of result.checks) {
  const state = check.configured ? "ok" : `missing ${check.missing.join(", ")}`;
  console.log(`${check.name} (${check.provider}): ${state}`);
}

if (!result.ok) {
  process.exitCode = 1;
}
