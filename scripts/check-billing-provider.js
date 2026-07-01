import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-billing-provider-"));
process.env.DB_PATH = join(tempRoot, "billing-provider.sqlite");
process.env.NODE_ENV = "test";
process.env.AUTH_CODE_PROVIDER = "mock";

let closeDatabaseRef = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { closeDatabase, initializeDatabase, query, queryOne, sqlValue } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;
  const { runCreditsMigration } = await import("../src/server/db/credits-migration.js");
  const { createUser } = await import("../src/server/auth/user.service.js");
  const {
    calculateCreditReservation,
    calculateReservedCreditCharge,
    calculateReservedCreditRelease
  } = await import("../src/server/services/billing.service.js");
  const {
    getCreditBalance,
    reserveCredits,
    chargeReservedCredits,
    releaseReservedCredits
  } = await import("../src/server/services/credits/credit.service.js");

  initializeDatabase();
  runCreditsMigration();

  const user = createUser({
    email: "billing-provider@example.com",
    password: "password123",
    name: "Billing Provider"
  });

  const initial = getCreditBalance(user.id);
  assert(initial.balanceCredits === 500, "New user should start with default credits");
  assert(initial.reservedCredits === 0, "New user should start with no reserved credits");

  const serviceReservation = calculateCreditReservation({
    account: { balance_credits: 500, reserved_credits: 10 },
    credits: 20
  });
  assert(serviceReservation.balance === 500, "Billing service reserve should preserve balance");
  assert(serviceReservation.nextReserved === 30, "Billing service reserve should add reserved credits");

  const serviceCharge = calculateReservedCreditCharge({
    account: { balance_credits: 500, reserved_credits: 30 },
    chargeCredits: 20,
    reservedCredits: 30
  });
  assert(serviceCharge.nextBalance === 480, "Billing service charge should deduct balance");
  assert(serviceCharge.nextReserved === 10, "Billing service charge should reduce reserved credits");
  assert(serviceCharge.reservedReduction === 20, "Billing service charge should report reserved reduction");

  const serviceRelease = calculateReservedCreditRelease({
    account: { balance_credits: 480, reserved_credits: 10 },
    credits: 5,
    status: "released"
  });
  assert(serviceRelease.balance === 480, "Billing service release should preserve balance");
  assert(serviceRelease.nextReserved === 5, "Billing service release should reduce reserved credits");

  const reservation = reserveCredits({
    userId: user.id,
    amount: 40,
    provider: "test",
    model: "billing-provider",
    task: "image_generation",
    billingType: "fixed",
    reason: "provider_check_reserve",
    requestId: "billing-provider-reserve"
  });
  assert(reservation.amountCredits === 40, "Reserve should report reserved amount");
  assert(reservation.balanceCredits === 500, "Reserve should not deduct balance");
  assert(reservation.reservedCredits === 40, "Reserve should increase reserved credits");

  const charge = chargeReservedCredits({
    userId: user.id,
    reservedAmount: 40,
    chargeAmount: 25,
    provider: "test",
    model: "billing-provider",
    task: "image_generation",
    billingType: "fixed",
    reason: "provider_check_charge",
    requestId: "billing-provider-charge"
  });
  assert(charge.chargedCredits === 25, "Charge should report charged amount");
  assert(charge.balanceCredits === 475, "Charge should deduct balance");
  assert(charge.reservedCredits === 15, "Charge should reduce only charged reserved credits");

  const release = releaseReservedCredits({
    userId: user.id,
    amount: 15,
    provider: "test",
    model: "billing-provider",
    task: "image_generation",
    billingType: "fixed",
    reason: "provider_check_release",
    requestId: "billing-provider-release",
    status: "released"
  });
  assert(release.balanceCredits === 475, "Release should not change balance");
  assert(release.reservedCredits === 0, "Release should clear remaining reserved credits");
  assert(release.availableCredits === 475, "Release should restore available credits");

  const finalBalance = getCreditBalance(user.id);
  assert(finalBalance.balanceCredits === 475, "Final balance should match charge");
  assert(finalBalance.reservedCredits === 0, "Final reserved credits should be zero");

  const rows = query(`
    SELECT type, amount_credits, balance_after, reserved_after, credits_reserved, credits_charged, status
    FROM credit_transactions
    WHERE user_id = ${sqlValue(user.id)}
      AND request_id LIKE 'billing-provider-%'
    ORDER BY created_at ASC;
  `);
  assert(rows.length === 3, "Reserve, charge, and release should each write a transaction");
  assertTransaction(rows[0], "reserve", 40, 500, 40, 40, 0, "reserved");
  assertTransaction(rows[1], "charge", 25, 475, 15, 25, 25, "charged");
  assertTransaction(rows[2], "release", 15, 475, 0, 15, 0, "released");

  try {
    reserveCredits({
      userId: user.id,
      amount: 10000,
      provider: "test",
      model: "billing-provider",
      task: "image_generation",
      billingType: "fixed",
      reason: "provider_check_insufficient",
      requestId: "billing-provider-insufficient"
    });
    throw new Error("Expected insufficient credits");
  } catch (error) {
    assert(error.code === "INSUFFICIENT_CREDITS", "Insufficient credits should keep the existing error code");
    assert(error.status === 402, "Insufficient credits should keep the existing HTTP status");
  }

  const insufficientRows = queryOne(`
    SELECT count(*) AS count
    FROM credit_transactions
    WHERE user_id = ${sqlValue(user.id)}
      AND request_id = 'billing-provider-insufficient';
  `);
  assert(Number(insufficientRows.count || 0) === 0, "Blocked reservation must not write a transaction");

  closeDatabase();
  console.log("Billing provider checks passed.");
} finally {
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function assertTransaction(row, type, amount, balanceAfter, reservedAfter, creditsReserved, creditsCharged, status) {
  assert(row.type === type, `Expected ${type} transaction`);
  assert(Number(row.amount_credits) === amount, `${type} amount should match`);
  assert(Number(row.balance_after) === balanceAfter, `${type} balance_after should match`);
  assert(Number(row.reserved_after) === reservedAfter, `${type} reserved_after should match`);
  assert(Number(row.credits_reserved) === creditsReserved, `${type} credits_reserved should match`);
  assert(Number(row.credits_charged) === creditsCharged, `${type} credits_charged should match`);
  assert(row.status === status, `${type} status should match`);
}
