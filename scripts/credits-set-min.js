import { randomUUID } from "node:crypto";
import { initializeDatabase } from "../src/server/db/sqlite.js";
import { runCreditsMigration } from "../src/server/db/credits-migration.js";
import { transaction } from "../src/server/db/sqlite.js";

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

const result = transaction((db) => {
  const users = db.prepare(`
    SELECT
      users.id,
      users.email,
      COALESCE(credit_accounts.balance_credits, 0) AS balance_credits,
      COALESCE(credit_accounts.reserved_credits, 0) AS reserved_credits
    FROM users
    LEFT JOIN credit_accounts ON credit_accounts.user_id = users.id
    ORDER BY users.created_at ASC;
  `).all();

  const eligible = users
    .map((user) => ({
      id: user.id,
      email: user.email,
      balanceCredits: Math.ceil(Number(user.balance_credits || 0)),
      reservedCredits: Math.ceil(Number(user.reserved_credits || 0)),
      availableCredits: Math.ceil(Number(user.balance_credits || 0)) - Math.ceil(Number(user.reserved_credits || 0))
    }))
    .map((user) => ({
      ...user,
      addCredits: Math.max(0, target - user.availableCredits)
    }))
    .filter((user) => user.addCredits > 0);

  if (dryRun || eligible.length === 0) {
    return summarize(users, eligible, { target, dryRun, updated: 0 });
  }

  const now = Date.now();
  const insertAccount = db.prepare(`
    INSERT INTO credit_accounts (user_id, balance_credits, reserved_credits, created_at, updated_at)
    VALUES (?, 0, 0, ?, ?)
    ON CONFLICT(user_id) DO NOTHING;
  `);
  const updateAccount = db.prepare(`
    UPDATE credit_accounts
    SET balance_credits = ?,
        updated_at = ?
    WHERE user_id = ?;
  `);
  const insertTransaction = db.prepare(`
    INSERT INTO credit_transactions (
      id, user_id, type, amount_credits, balance_after, reserved_after,
      provider, model, task, billing_type, input_tokens, output_tokens,
      total_tokens, credits_reserved, credits_charged, reason, request_id,
      status, created_at
    )
    VALUES (?, ?, 'admin_adjust', ?, ?, ?, '', '', '', '', NULL, NULL, NULL, 0, 0, ?, ?, 'charged', ?);
  `);

  for (const user of eligible) {
    insertAccount.run(user.id, now, now);
    const nextBalance = user.balanceCredits + user.addCredits;
    updateAccount.run(nextBalance, now, user.id);
    insertTransaction.run(
      randomUUID(),
      user.id,
      user.addCredits,
      nextBalance,
      user.reservedCredits,
      reason,
      `set-min:${target}:${user.id}:${now}`,
      now
    );
  }

  return summarize(users, eligible, { target, dryRun, updated: eligible.length });
});

console.log(JSON.stringify(result, null, 2));

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
