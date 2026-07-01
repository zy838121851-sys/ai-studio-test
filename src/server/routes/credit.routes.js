import { Router } from "express";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestUserId } from "../lib/request-auth.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getCreditBalance, listCreditTransactions } from "../services/credits/credit.service.js";
import { quoteFixedCredits } from "../services/credits/pricing.service.js";
import { inferProviderIdForModel } from "../services/model-catalog.service.js";

export function createCreditRouter() {
  const router = Router();

  router.get("/credits/balance", requireAuth, (req, res) => {
    res.json({ balance: getCreditBalance(getRequestUserId(req)) });
  });

  router.get("/credits/transactions", requireAuth, (req, res) => {
    res.json({
      transactions: listCreditTransactions(getRequestUserId(req), {
        limit: req.query.limit,
        offset: req.query.offset
      })
    });
  });

  router.get("/credits/quote", (req, res) => {
    const model = String(req.query.model || "").trim();
    const task = String(req.query.task || "").trim();
    const provider = inferProviderIdForModel(model);
    if (!provider) {
      sendErrorResponse(res, 402, "该模型未配置价格");
      return;
    }
    const quote = quoteFixedCredits({
      provider,
      model,
      task,
      count: req.query.count
    });
    res.json({ quote });
  });

  return router;
}
