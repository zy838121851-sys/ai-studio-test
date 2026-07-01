function accountBalance(account = {}) {
  return {
    balance: Number(account.balance_credits || 0),
    reserved: Number(account.reserved_credits || 0)
  };
}

export function createLocalBillingProvider() {
  return {
    reserve({ account, credits }) {
      const { balance, reserved } = accountBalance(account);
      return {
        balance,
        nextReserved: reserved + credits
      };
    },

    chargeReserved({ account, chargeCredits, reservedCredits }) {
      const { balance, reserved } = accountBalance(account);
      const reservedReduction = Math.min(reserved, Math.min(reservedCredits || chargeCredits, chargeCredits));
      return {
        nextBalance: balance - chargeCredits,
        nextReserved: Math.max(0, reserved - reservedReduction),
        reservedReduction
      };
    },

    releaseReserved({ account, credits }) {
      const { balance, reserved } = accountBalance(account);
      return {
        balance,
        nextReserved: Math.max(0, reserved - credits)
      };
    }
  };
}

export const localBillingProvider = createLocalBillingProvider();
