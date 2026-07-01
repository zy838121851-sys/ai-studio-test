import { localBillingProvider } from "../providers/billing/local-billing.provider.js";

export function calculateCreditReservation({ account, credits } = {}) {
  return localBillingProvider.reserve({ account, credits });
}

export function calculateReservedCreditCharge({ account, chargeCredits, reservedCredits } = {}) {
  return localBillingProvider.chargeReserved({ account, chargeCredits, reservedCredits });
}

export function calculateReservedCreditRelease({ account, credits, status } = {}) {
  return localBillingProvider.releaseReserved({ account, credits, status });
}
