import { localBillingProvider } from "../providers/billing/local-billing.provider.js";

const BILLING_PROVIDER_METHODS = ["reserve", "chargeReserved", "releaseReserved"];
let defaultBillingProvider = localBillingProvider;

export function getDefaultBillingProvider() {
  return defaultBillingProvider;
}

export function setDefaultBillingProvider(provider) {
  for (const method of BILLING_PROVIDER_METHODS) {
    if (typeof provider?.[method] !== "function") {
      throw new TypeError(`Billing provider must implement ${method}()`);
    }
  }
  defaultBillingProvider = provider;
  return defaultBillingProvider;
}

export function resetDefaultBillingProvider() {
  defaultBillingProvider = localBillingProvider;
  return defaultBillingProvider;
}

export function getBillingProviderCapabilities(provider = getDefaultBillingProvider()) {
  return {
    creditLedger: Boolean(provider?.capabilities?.creditLedger),
    orders: Boolean(provider?.capabilities?.orders),
    payments: Boolean(provider?.capabilities?.payments),
    refunds: Boolean(provider?.capabilities?.refunds),
    invoices: Boolean(provider?.capabilities?.invoices)
  };
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
