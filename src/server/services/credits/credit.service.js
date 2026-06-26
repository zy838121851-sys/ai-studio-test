import { randomUUID } from "node:crypto";
import { prepare, transaction } from "../../db/sqlite.js";
import { DEFAULT_SIGNUP_CREDITS } from "../../db/credits-migration.js";

export function getCreditBalance(userId) {
  const account = getCreditAccount(userId);
  return toPublicBalance(account || {
    user_id: userId,
    balance_credits: 0,
    reserved_credits: 0
  });
}

export function listCreditTransactions(userId, { limit = 50, offset = 0 } = {}) {
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
  `).all(userId, normalizeLimit(limit), Math.max(0, Number(offset || 0))).map(toPublicTransaction);
}

export function ensureCreditAccount(userId, {
  initialCredits = DEFAULT_SIGNUP_CREDITS,
  reason = "initial_signup_grant",
  requestId = `initial-grant:${userId}`
} = {}) {
  return transaction((db) => {
    const existing = db.prepare("SELECT * FROM credit_accounts WHERE user_id = ? LIMIT 1;").get(userId);
    if (existing) return toPublicBalance(existing);
    const now = Date.now();
    const credits = toCredits(initialCredits);
    db.prepare(`
      INSERT INTO credit_accounts (user_id, balance_credits, reserved_credits, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?);
    `).run(userId, credits, now, now);
    db.prepare(`
      INSERT INTO credit_transactions (
        id, user_id, type, amount_credits, balance_after, reserved_after,
        provider, model, task, billing_type, credits_reserved, credits_charged,
        reason, request_id, status, created_at
      )
      VALUES (?, ?, 'grant', ?, ?, 0, '', '', '', '', 0, 0, ?, ?, 'charged', ?);
    `).run(randomUUID(), userId, credits, credits, reason, requestId, now);
    return {
      userId,
      balanceCredits: credits,
      reservedCredits: 0,
      availableCredits: credits
    };
  });
}

export function addCredits(userId, { amount, reason = "admin_adjust", requestId = randomUUID() } = {}) {
  return transaction((db) => {
    const account = getOrCreateZeroAccount(db, userId);
    const credits = toCredits(amount);
    const now = Date.now();
    const balance = Number(account.balance_credits || 0) + credits;
    const reserved = Number(account.reserved_credits || 0);
    db.prepare(`
      UPDATE credit_accounts
      SET balance_credits = ?, updated_at = ?
      WHERE user_id = ?;
    `).run(balance, now, userId);
    insertTransaction(db, {
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

export function reserveCredits({ userId, amount, provider = "", model = "", task = "", billingType = "", reason = "", requestId = randomUUID() } = {}) {
  return transaction((db) => {
    const account = getOrCreateZeroAccount(db, userId);
    const credits = toCredits(amount);
    const balance = Number(account.balance_credits || 0);
    const reserved = Number(account.reserved_credits || 0);
    if (balance - reserved < credits) {
      const error = new Error("积分不足");
      error.status = 402;
      error.code = "INSUFFICIENT_CREDITS";
      throw error;
    }
    const now = Date.now();
    const nextReserved = reserved + credits;
    db.prepare(`
      UPDATE credit_accounts
      SET reserved_credits = ?, updated_at = ?
      WHERE user_id = ?;
    `).run(nextReserved, now, userId);
    insertTransaction(db, {
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
  requestId = ""
} = {}) {
  return transaction((db) => {
    const account = getRequiredAccount(db, userId);
    const chargeCredits = toCredits(chargeAmount);
    const reservedCredits = Math.max(0, Math.ceil(Number(reservedAmount || 0)));
    const now = Date.now();
    const balance = Number(account.balance_credits || 0);
    const reserved = Number(account.reserved_credits || 0);
    const reservedReduction = Math.min(reserved, Math.min(reservedCredits || chargeCredits, chargeCredits));
    const nextBalance = balance - chargeCredits;
    const nextReserved = Math.max(0, reserved - reservedReduction);
    db.prepare(`
      UPDATE credit_accounts
      SET balance_credits = ?, reserved_credits = ?, updated_at = ?
      WHERE user_id = ?;
    `).run(nextBalance, nextReserved, now, userId);
    insertTransaction(db, {
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
  status = "released"
} = {}) {
  const credits = Math.max(0, Math.ceil(Number(amount || 0)));
  if (!credits) return getCreditBalance(userId);
  return transaction((db) => {
    const account = getRequiredAccount(db, userId);
    const now = Date.now();
    const balance = Number(account.balance_credits || 0);
    const nextReserved = Math.max(0, Number(account.reserved_credits || 0) - credits);
    db.prepare(`
      UPDATE credit_accounts
      SET reserved_credits = ?, updated_at = ?
      WHERE user_id = ?;
    `).run(nextReserved, now, userId);
    insertTransaction(db, {
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
      status,
      createdAt: now
    });
    return { userId, balanceCredits: balance, reservedCredits: nextReserved, availableCredits: balance - nextReserved };
  });
}

function getCreditAccount(userId) {
  return prepare("SELECT * FROM credit_accounts WHERE user_id = ? LIMIT 1;").get(userId);
}

function getOrCreateZeroAccount(db, userId) {
  const existing = db.prepare("SELECT * FROM credit_accounts WHERE user_id = ? LIMIT 1;").get(userId);
  if (existing) return existing;
  const now = Date.now();
  db.prepare(`
    INSERT INTO credit_accounts (user_id, balance_credits, reserved_credits, created_at, updated_at)
    VALUES (?, 0, 0, ?, ?);
  `).run(userId, now, now);
  return { user_id: userId, balance_credits: 0, reserved_credits: 0, created_at: now, updated_at: now };
}

function getRequiredAccount(db, userId) {
  const account = db.prepare("SELECT * FROM credit_accounts WHERE user_id = ? LIMIT 1;").get(userId);
  if (!account) {
    const error = new Error("Credit account not found. Run credits migration first.");
    error.status = 500;
    throw error;
  }
  return account;
}

function insertTransaction(db, input) {
  db.prepare(`
    INSERT INTO credit_transactions (
      id, user_id, type, amount_credits, balance_after, reserved_after,
      provider, model, task, billing_type, input_tokens, output_tokens,
      total_tokens, credits_reserved, credits_charged, reason, request_id,
      status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run(
    randomUUID(),
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
    input.status || "",
    input.createdAt || Date.now()
  );
}

function toPublicBalance(row) {
  const balanceCredits = Math.ceil(Number(row.balance_credits || 0));
  const reservedCredits = Math.ceil(Number(row.reserved_credits || 0));
  return {
    userId: row.user_id,
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

function normalizeLimit(limit) {
  return Math.min(100, Math.max(1, Math.ceil(Number(limit || 50))));
}

function toCredits(value) {
  const credits = Math.ceil(Number(value || 0));
  if (!Number.isFinite(credits) || credits <= 0) {
    const error = new Error("Credit amount must be a positive integer");
    error.status = 400;
    throw error;
  }
  return credits;
}

function nullableInteger(value) {
  return value === null || value === undefined ? null : Math.ceil(Number(value || 0));
}
