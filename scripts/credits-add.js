import { initializeDatabase } from "../src/server/db/sqlite.js";
import { findUserByEmail } from "../src/server/auth/user.service.js";
import { addCredits } from "../src/server/services/credits/credit.service.js";

const args = parseArgs(process.argv.slice(2));
const email = String(args.email || "").trim().toLowerCase();
const amount = Number(args.amount || 0);
const reason = String(args.reason || "管理员调整").trim();

initializeDatabase();

if (!email || !Number.isFinite(amount) || amount <= 0) {
  console.error("Usage: npm run credits:add -- --email=\"user@example.com\" --amount=100 --reason=\"管理员赠送\"");
  process.exit(1);
}

const user = findUserByEmail(email);
if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

const balance = addCredits(user.id, {
  amount,
  reason
});

console.log(JSON.stringify({
  ok: true,
  email,
  balance
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
