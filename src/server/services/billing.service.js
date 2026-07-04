import { localBillingProvider } from "../providers/billing/local-billing.provider.js";

export function getDefaultBillingProvider() {
  return localBillingProvider;
}

export function calculateCreditReservation({ account, credits } = {}) {
  return getDefaultBillingProvider().reserve({ account, credits });
}

export function calculateReservedCreditCharge({ account, chargeCredits, reservedCredits } = {}) {
  return getDefaultBillingProvider().chargeReserved({ account, chargeCredits, reservedCredits });
}

export function calculateReservedCreditRelease({ account, credits, status } = {}) {
  return getDefaultBillingProvider().releaseReserved({ account, credits, status });
}
