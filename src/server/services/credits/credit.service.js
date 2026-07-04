import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../../db/sqlite.js";
import { DEFAULT_SIGNUP_CREDITS } from "../../db/credits-migration.js";
import { normalizePaginationLimit, normalizePaginationOffset } from "../../lib/api-pagination.js";
import { createHttpError } from "../../lib/input-validation.js";
import {
  calculateCreditReservation,
  calculateReservedCreditCharge,
  calculateReservedCreditRelease
} from "../billing.service.js";
import { ensureUserWorkspaceWithDb } from "../workspace.service.js";

function userIdFromPrincipal(principal) {
  return typeof principal === "string" ? principal : principal?.userId;
}

export function getCreditBalance(principal) {
  const userId = userIdFromPrincipal(principal);
  const account = getCreditAccount(userId);
  return toPublicBalance(account || {
    user_id: userId,
    owner_user_id: userId,
    balance_credits: 0,
    reserved_credits: 0
  });
}

export function listCreditTransactions(principal, { limit = 50, offset = 0 } = {}) {
  const userId = userIdFromPrincipal(principal);
  return prepare(`
    SELECT
      id, type, amount_credits, balance_after, reserved_after,
      provider, model, task, billing_type, input_tokens, output_tokens,
      total_tokens, credits_reserved, credits_charged, reason,
      request_id, status, created_at
    FROM credit_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
    OFFSET ?;
  `).all(
    userId,
    normalizePaginationLimit(limit, { fallback: 50, max: 100 }),
    normalizePaginationOffset(offset)
  ).map(toPublicTransaction);
}

export function ensureCreditAccount(principal, {
  initialCredits = DEFAULT_SIGNUP_CREDITS,
  reason = "initial_signup_grant",
  requestId
} = {}) {
  const userId = userIdFromPrincipal(principal);
  const resolvedRequestId = requestId || `initial-grant:${userId}`;
  return transaction((db) => {
    const account = getOrCreateZeroAccount(db, userId);
    const grant = db.prepare(`
      SELECT id
      FROM credit_transactions
      WHERE billing_account_id = ?
        AND type = 'grant'
        AND request_id = ?
      LIMIT 1;
    `).get(account.id, resolvedRequestId);
    if (grant) return toPublicBalance({ ...account, user_id: userId });

    const credits = Math.ceil(Number(initialCredits || 0));
    if (!Number.isFinite(credits) || credits <= 0) {
      return toPublicBalance({ ...account, user_id: userId });
    }

    const now = Date.now();
    const balance = Number(account.balance_credits || 0) + credits;
    const reserved = Number(account.reserved_credits || 0);
    db.prepare(`
      UPDATE billing_accounts
      SET balance_credits = ?,
          updated_at = ?
      WHERE id = ?;
    `).run(balance, now, account.id);
    insertTransaction(db, {
      account,
      userId,
      type: "grant",
      amountCredits: credits,
      balanceAfter: balance,
      reservedAfter: reserved,
      reason,
      requestId: resolvedRequestId,
      status: "charged",
      createdAt: now
    });
    return { userId, balanceCredits: balance, reservedCredits: reserved, availableCredits: balance - reserved };
  });
}

export function addCredits(principal, { amount, reason = "admin_adjust", requestId = randomUUID() } = {}) {
  const userId = userIdFromPrincipal(principal);
  return transaction((db) => {
    const account = getOrCreateZeroAccount(db, userId);
    const credits = toCredits(amount);
    const now = Date.now();
    const balance = Number(account.balance_credits || 0) + credits;
    const reserved = Number(account.reserved_credits || 0);
    db.prepare(`
      UPDATE billing_accounts
      SET balance_credits = ?,
          updated_at = ?
      WHERE id = ?;
    `).run(balance, now, account.id);
    insertTransaction(db, {
      account,
      userId,
      type: "admin_adjust",
      amountCredits: credits,
      balanceAfter: balance,
      reservedAfter: reserved,
      reason,
      requestId,
      status: "charged",
      createdAt: now
    });
    return { userId, balanceCredits: balance, reservedCredits: reserved, availableCredits: balance - reserved };
  });
}

export function reserveCredits({
  userId,
  amount,
  provider = "",
  model = "",
  task = "",
  billingType = "",
  reason = "",
  requestId = randomUUID()
} = {}) {
  return transaction((db) => {
    const account = getOrCreateZeroAccount(db, userId);
    const credits = toCredits(amount);
    const billing = calculateCreditReservation({ account, credits });
    const balance = Number(account.balance_credits || 0);
    const reserved = Number(account.reserved_credits || 0);
    if (balance - reserved < credits) {
      const error = createHttpError("积分不足", 402);
      error.code = "INSUFFICIENT_CREDITS";
      throw error;
    }
    const now = Date.now();
    const nextReserved = billing.nextReserved;
    db.prepare(`
      UPDATE billing_accounts
      SET reserved_credits = ?,
          updated_at = ?
      WHERE id = ?;
    `).run(nextReserved, now, account.id);
    insertTransaction(db, {
      account,
      userId,
      type: "reserve",
      amountCredits: credits,
      balanceAfter: balance,
      reservedAfter: nextReserved,
      provider,
      model,
      task,
      billingType,
      creditsReserved: credits,
      reason,
      requestId,
      status: "reserved",
      createdAt: now
    });
    return { userId, amountCredits: credits, requestId, balanceCredits: balance, reservedCredits: nextReserved };
  });
}

export function chargeReservedCredits({
  userId,
  reservedAmount,
  chargeAmount,
  provider = "",
  model = "",
  task = "",
  billingType = "",
  usage = {},
  reason = "",
  requestId = "",
  aiJobId = ""
} = {}) {
  return transaction((db) => {
    const account = getRequiredAccount(db, userId);
    const chargeCredits = toCredits(chargeAmount);
    const reservedCredits = Math.max(0, Math.ceil(Number(reservedAmount || 0)));
    const billing = calculateReservedCreditCharge({ account, chargeCredits, reservedCredits });
    const now = Date.now();
    const reservedReduction = billing.reservedReduction;
    const nextBalance = billing.nextBalance;
    const nextReserved = billing.nextReserved;
    db.prepare(`
      UPDATE billing_accounts
      SET balance_credits = ?,
          reserved_credits = ?,
          updated_at = ?
      WHERE id = ?;
    `).run(nextBalance, nextReserved, now, account.id);
    insertTransaction(db, {
      account,
      userId,
      type: "charge",
      amountCredits: chargeCredits,
      balanceAfter: nextBalance,
      reservedAfter: nextReserved,
      provider,
      model,
      task,
      billingType,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      creditsReserved: reservedReduction,
      creditsCharged: chargeCredits,
      reason,
      requestId,
      aiJobId,
      status: "charged",
      createdAt: now
    });
    return { userId, balanceCredits: nextBalance, reservedCredits: nextReserved, chargedCredits: chargeCredits };
  });
}

export function releaseReservedCredits({
  userId,
  amount,
  provider = "",
  model = "",
  task = "",
  billingType = "",
  reason = "",
  requestId = "",
  status = "released",
  aiJobId = ""
} = {}) {
  const credits = Math.max(0, Math.ceil(Number(amount || 0)));
  if (!credits) return getCreditBalance(userId);
  return transaction((db) => {
    const account = getRequiredAccount(db, userId);
    const billing = calculateReservedCreditRelease({ account, credits, status });
    const now = Date.now();
    const balance = billing.balance;
    const nextReserved = billing.nextReserved;
    db.prepare(`
      UPDATE billing_accounts
      SET reserved_credits = ?,
          updated_at = ?
      WHERE id = ?;
    `).run(nextReserved, now, account.id);
    insertTransaction(db, {
      account,
      userId,
      type: "release",
      amountCredits: credits,
      balanceAfter: balance,
      reservedAfter: nextReserved,
      provider,
      model,
      task,
      billingType,
      creditsReserved: credits,
      reason,
      requestId,
      aiJobId,
      status,
      createdAt: now
    });
    return { userId, balanceCredits: balance, reservedCredits: nextReserved, availableCredits: balance - nextReserved };
  });
}

function getCreditAccount(userId) {
  return prepare(`
    SELECT
      ba.*,
      wm.user_id AS user_id
    FROM workspace_memberships wm
    JOIN workspaces w
      ON w.id = wm.workspace_id
      AND w.deleted_at IS NULL
    JOIN billing_accounts ba
      ON ba.workspace_id = w.id
    WHERE wm.user_id = ?
      AND wm.deleted_at IS NULL
    ORDER BY CASE WHEN w.type = 'personal' THEN 0 ELSE 1 END, wm.created_at ASC
    LIMIT 1;
  `).get(userId);
}

function getOrCreateZeroAccount(db, userId) {
  const scope = ensureUserWorkspaceWithDb(db, userId);
  const account = db.prepare(`
    SELECT
      ba.*,
      ? AS user_id
    FROM billing_accounts ba
    WHERE ba.id = ?
    LIMIT 1;
  `).get(userId, scope.billingAccountId);
  if (!account) {
    throw createHttpError("Billing account not found", 500);
  }
  return account;
}

function getRequiredAccount(db, userId) {
  const account = getOrCreateZeroAccount(db, userId);
  if (!account) {
    throw createHttpError("Credit account not found. Run credits migration first.", 500);
  }
  return account;
}

function insertTransaction(db, input) {
  const account = input.account;
  db.prepare(`
    INSERT INTO credit_transactions (
      id, billing_account_id, workspace_id, user_id, type, amount_credits,
      balance_after, reserved_after, provider, model, task, billing_type,
      input_tokens, output_tokens, total_tokens, credits_reserved,
      credits_charged, reason, request_id, idempotency_key, ai_job_id,
      metadata_json, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run(
    randomUUID(),
    account.id,
    account.workspace_id,
    input.userId,
    input.type,
    Math.ceil(Number(input.amountCredits || 0)),
    Math.ceil(Number(input.balanceAfter || 0)),
    Math.ceil(Number(input.reservedAfter || 0)),
    input.provider || "",
    input.model || "",
    input.task || "",
    input.billingType || "",
    nullableInteger(input.inputTokens),
    nullableInteger(input.outputTokens),
    nullableInteger(input.totalTokens),
    Math.ceil(Number(input.creditsReserved || 0)),
    Math.ceil(Number(input.creditsCharged || 0)),
    input.reason || "",
    input.requestId || "",
    input.idempotencyKey || input.requestId || "",
    input.aiJobId || null,
    stringifyMetadata(input.metadata),
    input.status || "",
    input.createdAt || Date.now()
  );
}

function toPublicBalance(row) {
  const balanceCredits = Math.ceil(Number(row.balance_credits || 0));
  const reservedCredits = Math.ceil(Number(row.reserved_credits || 0));
  return {
    userId: row.user_id || row.owner_user_id,
    balanceCredits,
    reservedCredits,
    availableCredits: balanceCredits - reservedCredits
  };
}

function toPublicTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    amountCredits: row.amount_credits,
    balanceAfter: row.balance_after,
    reservedAfter: row.reserved_after,
    provider: row.provider,
    model: row.model,
    task: row.task,
    billingType: row.billing_type,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    creditsReserved: row.credits_reserved,
    creditsCharged: row.credits_charged,
    reason: row.reason,
    requestId: row.request_id,
    status: row.status,
    createdAt: row.created_at
  };
}

function toCredits(value) {
  const credits = Math.ceil(Number(value || 0));
  if (!Number.isFinite(credits) || credits <= 0) {
    throw createHttpError("Credit amount must be a positive integer", 400);
  }
  return credits;
}

function nullableInteger(value) {
  return value === null || value === undefined ? null : Math.ceil(Number(value || 0));
}

function stringifyMetadata(value = {}) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return "{}";
  }
}
