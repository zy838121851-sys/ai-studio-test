import { describe, expect, it } from "vitest";

import {
  createMoney,
  transitionOrder,
  transitionPayment,
  transitionSubscription
} from "./billing-domain.js";
import { ApplicationError } from "../application/application-error.js";

describe("billing domain", () => {
  it("keeps money in integer fen", () => {
    expect(createMoney("CNY", 1299)).toEqual({ currency: "CNY", amountFen: 1299 });
    expect(() => createMoney("CNY", 12.5)).toThrow(ApplicationError);
  });

  it("allows only explicit order, payment, and subscription transitions", () => {
    expect(transitionOrder("pending", "paid")).toBe("paid");
    expect(transitionPayment("succeeded", "refunded")).toBe("refunded");
    expect(transitionSubscription("active", "cancelled")).toBe("cancelled");
    try {
      transitionOrder("cancelled", "paid");
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_ORDER_TRANSITION" });
    }
    try {
      transitionPayment("refunded", "succeeded");
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_PAYMENT_TRANSITION" });
    }
  });
});
