import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { databasePath, execute, prepare, query, transaction } from "./sqlite.js";
import { seedDefaultPricing } from "../services/credits/pricing.service.js";

export const DEFAULT_SIGNUP_CREDITS = 500;

export function backupCreditsDatabase() {
  if (!existsSync(databasePath)) return null;
  const backupDir = join(dirname(databasePath), "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `ai-studio-before-credits-${stamp}.sqlite`);
  copyFileSync(databasePath, backupPath);
  return backupPath;
}

export function runCreditsMigration({ grantExistingUsers = true } = {}) {
  createCreditTables();
  seedDefaultPricing();
  if (grantExistingUsers) grantMissingUserAccounts();
}

function createCreditTables() {
  execute(`
    CREATE TABLE IF NOT EXISTS credit_accounts (
      user_id TEXT PRIMARY KEY,
      balance_credits INTEGER NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
      reserved_credits INTEGER NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_credits INTEGER NOT NULL DEFAULT 0,
      balance_after INTEGER NOT NULL DEFAULT 0,
      reserved_after INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      task TEXT NOT NULL DEFAULT '',
      billing_type TEXT NOT NULL DEFAULT '',
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      credits_reserved INTEGER NOT NULL DEFAULT 0,
      credits_charged INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
      ON credit_transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_request
      ON credit_transactions(request_id);

    CREATE TABLE IF NOT EXISTS model_pricing (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      task TEXT NOT NULL,
      billing_type TEXT NOT NULL,
      fixed_credits INTEGER,
      input_price_per_million_tokens REAL,
      output_price_per_million_tokens REAL,
      cached_input_price_per_million_tokens REAL,
      min_credits_per_request INTEGER NOT NULL DEFAULT 1,
      markup_multiplier REAL NOT NULL DEFAULT 2,
      fallback_fixed_credits INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider, model, task)
    );

    CREATE INDEX IF NOT EXISTS idx_model_pricing_lookup
      ON model_pricing(provider, model, task, enabled);
  `);
}

function grantMissingUserAccounts() {
  const users = query(`
    SELECT users.id
    FROM users
    LEFT JOIN credit_accounts ON credit_accounts.user_id = users.id
    WHERE credit_accounts.user_id IS NULL;
  `);
  if (!users.length) return;

  transaction((db) => {
    const now = Date.now();
    const insertAccount = db.prepare(`
      INSERT INTO credit_accounts (user_id, balance_credits, reserved_credits, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?);
    `);
    const insertTransaction = db.prepare(`
      INSERT INTO credit_transactions (
        id, user_id, type, amount_credits, balance_after, reserved_after,
        provider, model, task, billing_type, credits_reserved, credits_charged,
        reason, request_id, status, created_at
      )
      VALUES (?, ?, 'grant', ?, ?, 0, '', '', '', '', 0, 0, ?, ?, 'charged', ?);
    `);
    for (const user of users) {
      insertAccount.run(user.id, DEFAULT_SIGNUP_CREDITS, now, now);
      insertTransaction.run(
        randomUUID(),
        user.id,
        DEFAULT_SIGNUP_CREDITS,
        DEFAULT_SIGNUP_CREDITS,
        "initial_signup_grant",
        `initial-grant:${user.id}`,
        now
      );
    }
  });
}

export function creditsTablesExist() {
  return Boolean(prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'credit_accounts'
    LIMIT 1;
  `).get());
}
