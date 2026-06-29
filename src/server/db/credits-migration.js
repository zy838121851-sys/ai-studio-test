import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { databasePath, prepare, query, transaction } from "./sqlite.js";
import { seedDefaultPricing } from "../services/credits/pricing.service.js";
import { ensureUserWorkspaceWithDb } from "../services/workspace.service.js";

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
  assertV2CreditTables();
  seedDefaultPricing();
  if (grantExistingUsers) grantMissingUserAccounts();
}

function assertV2CreditTables() {
  const missing = [
    "workspaces",
    "workspace_memberships",
    "billing_accounts",
    "credit_transactions",
    "model_pricing"
  ].filter((name) => !tableExists(name));
  if (missing.length) {
    throw new Error(`V2 credit tables are missing: ${missing.join(", ")}`);
  }
}

function grantMissingUserAccounts() {
  const users = query(`
    SELECT id
    FROM users
    WHERE deleted_at IS NULL;
  `);
  if (!users.length) return;

  transaction((db) => {
    const now = Date.now();
    for (const user of users) {
      const scope = ensureUserWorkspaceWithDb(db, user.id);
      const account = db.prepare(`
        SELECT *
        FROM billing_accounts
        WHERE id = ?
        LIMIT 1;
      `).get(scope.billingAccountId);
      if (!account) continue;

      const requestId = `initial-grant:${user.id}`;
      const existingGrant = db.prepare(`
        SELECT id
        FROM credit_transactions
        WHERE billing_account_id = ?
          AND type = 'grant'
          AND request_id = ?
        LIMIT 1;
      `).get(account.id, requestId);
      if (existingGrant) continue;

      const balance = Number(account.balance_credits || 0) + DEFAULT_SIGNUP_CREDITS;
      const reserved = Number(account.reserved_credits || 0);
      db.prepare(`
        UPDATE billing_accounts
        SET balance_credits = ?,
            updated_at = ?
        WHERE id = ?;
      `).run(balance, now, account.id);
      db.prepare(`
        INSERT INTO credit_transactions (
          id, billing_account_id, workspace_id, user_id, type, amount_credits,
          balance_after, reserved_after, provider, model, task, billing_type,
          credits_reserved, credits_charged, reason, request_id,
          idempotency_key, metadata_json, status, created_at
        )
        VALUES (?, ?, ?, ?, 'grant', ?, ?, ?, '', '', '', '', 0, 0, ?, ?, ?, '{}', 'charged', ?);
      `).run(
        randomUUID(),
        account.id,
        account.workspace_id,
        user.id,
        DEFAULT_SIGNUP_CREDITS,
        balance,
        reserved,
        "initial_signup_grant",
        requestId,
        requestId,
        now
      );
    }
  });
}

export function creditsTablesExist() {
  return tableExists("billing_accounts") && tableExists("credit_transactions");
}

function tableExists(name) {
  return Boolean(prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
    LIMIT 1;
  `).get(name));
}
