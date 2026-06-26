import { initializeDatabase } from "../src/server/db/sqlite.js";
import { findUserByEmail } from "../src/server/auth/user.service.js";
import { getCreditBalance, listCreditTransactions } from "../src/server/services/credits/credit.service.js";

const args = parseArgs(process.argv.slice(2));
const email = String(args.email || "").trim().toLowerCase();

initializeDatabase();

if (!email) {
  console.error("Usage: npm run credits:check -- --email=\"user@example.com\"");
  process.exit(1);
}

const user = findUserByEmail(email);
if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  email,
  balance: getCreditBalance(user.id),
  recentTransactions: listCreditTransactions(user.id, { limit: 10 })
}, null, 2));

function parseArgs(argv) {
  return Object.fromEntries(argv
    .filter((item) => item.startsWith("--"))
    .map((item) => {
      const index = item.indexOf("=");
      if (index === -1) return [item.slice(2), "true"];
      return [item.slice(2, index), item.slice(index + 1)];
    }));
}
