import { initializeDatabase, query } from "../src/server/db/sqlite.js";
import { runCreditsMigration } from "../src/server/db/credits-migration.js";
import { addCredits, getCreditBalance } from "../src/server/services/credits/credit.service.js";

const args = parseArgs(process.argv.slice(2));
const target = Math.ceil(Number(args.target || 500));
const dryRun = parseBoolean(args["dry-run"] || args.dryRun);
const reason = String(args.reason || `admin_set_available_min_${target}`).trim();

if (!Number.isFinite(target) || target <= 0) {
  console.error("Usage: npm run credits:set-min -- --target=500 [--dry-run] [--reason=admin_set_available_min_500]");
  process.exit(1);
}

initializeDatabase();
runCreditsMigration();

const users = query(`
  SELECT id, email
  FROM users
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC;
`).map((user) => {
  const balance = getCreditBalance(user.id);
  return {
    id: user.id,
    email: user.email,
    balanceCredits: balance.balanceCredits,
    reservedCredits: balance.reservedCredits,
    availableCredits: balance.availableCredits
  };
});

const eligible = users
  .map((user) => ({
    ...user,
    addCredits: Math.max(0, target - user.availableCredits)
  }))
  .filter((user) => user.addCredits > 0);

if (!dryRun) {
  const timestamp = Date.now();
  for (const user of eligible) {
    addCredits(user.id, {
      amount: user.addCredits,
      reason,
      requestId: `set-min:${target}:${user.id}:${timestamp}`
    });
  }
}

console.log(JSON.stringify(summarize(users, eligible, {
  target,
  dryRun,
  updated: dryRun ? 0 : eligible.length
}), null, 2));

function summarize(users, eligible, { target, dryRun, updated }) {
  return {
    ok: true,
    target,
    dryRun,
    totalUsers: users.length,
    usersBelowTarget: eligible.length,
    updated,
    totalCreditsAdded: eligible.reduce((sum, user) => sum + user.addCredits, 0),
    users: eligible.map((user) => ({
      email: user.email,
      balanceBefore: user.balanceCredits,
      balanceAfter: user.balanceCredits + user.addCredits,
      availableBefore: user.availableCredits,
      availableAfter: target,
      added: user.addCredits,
      reserved: user.reservedCredits
    }))
  };
}

function parseArgs(argv) {
  return Object.fromEntries(argv
    .filter((item) => item.startsWith("--"))
    .map((item) => {
      const index = item.indexOf("=");
      if (index === -1) return [item.slice(2), "true"];
      return [item.slice(2, index), item.slice(index + 1)];
    }));
}

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}
