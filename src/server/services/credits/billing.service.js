import { randomUUID } from "node:crypto";
import {
  chargeReservedCredits,
  releaseReservedCredits,
  reserveCredits
} from "./credit.service.js";
import {
  calculateTokenCredits,
  estimateTokenCredits,
  quoteFixedCredits,
  resolvePricing
} from "./pricing.service.js";

export async function billFixedTask({
  userId,
  provider,
  model,
  task,
  count = 1,
  reason = "",
  requestId = randomUUID(),
  callProvider
} = {}) {
  const quote = quoteFixedCredits({ provider, model, task, count });
  const credits = quote.totalCredits;
  const reservation = reserveCredits({
    userId,
    amount: credits,
    provider,
    model,
    task,
    billingType: "fixed",
    reason,
    requestId
  });
  try {
    const result = await callProvider({
      requestId,
      reservation,
      quote
    });
    if (result?.deferCharge) {
      return attachBilling(result, result.billing || {
        requestId,
        provider,
        model,
        task,
        billingType: "fixed",
        creditsReserved: reservation.amountCredits,
        creditsCharged: 0,
        unitCredits: quote.unitCredits,
        count: quote.count,
        status: "reserved"
      });
    }
    const charge = chargeReservedCredits({
      userId,
      reservedAmount: reservation.amountCredits,
      chargeAmount: credits,
      provider,
      model,
      task,
      billingType: "fixed",
      reason,
      requestId
    });
    return attachBilling(result, {
      requestId,
      provider,
      model,
      task,
      billingType: "fixed",
      creditsReserved: reservation.amountCredits,
      creditsCharged: charge.chargedCredits,
      unitCredits: quote.unitCredits,
      count: quote.count,
      status: "charged"
    });
  } catch (error) {
    releaseReservedCredits({
      userId,
      amount: reservation.amountCredits,
      provider,
      model,
      task,
      billingType: "fixed",
      reason: error?.message || "provider_failed",
      requestId,
      status: "failed"
    });
    throw error;
  }
}

export async function billTokenTask({
  userId,
  provider,
  model,
  task,
  estimate = {},
  reason = "",
  requestId = randomUUID(),
  callProvider
} = {}) {
  const pricing = resolvePricing({ provider, model, task });
  const reservedCredits = estimateTokenCredits({ pricing, ...estimate });
  const reservation = reserveCredits({
    userId,
    amount: reservedCredits,
    provider,
    model,
    task,
    billingType: "token",
    reason,
    requestId
  });
  try {
    const result = await callProvider();
    const actual = calculateTokenCredits({ pricing, usage: result?.usage || result?.raw?.usage });
    const charge = chargeReservedCredits({
      userId,
      reservedAmount: reservation.amountCredits,
      chargeAmount: actual.credits,
      provider,
      model,
      task,
      billingType: "token",
      usage: actual.usage,
      reason: actual.reason || reason,
      requestId
    });
    if (reservation.amountCredits > actual.credits) {
      releaseReservedCredits({
        userId,
        amount: reservation.amountCredits - actual.credits,
        provider,
        model,
        task,
        billingType: "token",
        reason: "release_unused_reservation",
        requestId,
        status: "released"
      });
    }
    return attachBilling(result, {
      requestId,
      provider,
      model,
      task,
      billingType: "token",
      creditsReserved: reservation.amountCredits,
      creditsCharged: charge.chargedCredits,
      usage: actual.usage,
      reason: actual.reason,
      status: "charged"
    });
  } catch (error) {
    releaseReservedCredits({
      userId,
      amount: reservation.amountCredits,
      provider,
      model,
      task,
      billingType: "token",
      reason: error?.message || "provider_failed",
      requestId,
      status: "failed"
    });
    throw error;
  }
}

function attachBilling(result, billing) {
  return {
    ...(result || {}),
    billing
  };
}
