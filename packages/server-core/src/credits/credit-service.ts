import type { CreditBalanceDto, CreditQuoteDto } from "@ai-studio/contracts";
import { eq } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { creditAccounts } from "../database/schema.js";
import { quoteModel } from "../models/model-catalog.js";

export class CreditService {
  constructor(private readonly database: RewriteDatabase) {}

  quote(modelId: string, count: number): CreditQuoteDto {
    return quoteModel(modelId, count);
  }

  async getBalance(context: AuthContext): Promise<CreditBalanceDto> {
    const [account] = await this.database
      .select({ balance: creditAccounts.balance, reserved: creditAccounts.reserved })
      .from(creditAccounts)
      .where(eq(creditAccounts.workspaceId, context.workspaceId))
      .limit(1);
    if (!account) {
      throw new ApplicationError("CREDIT_ACCOUNT_NOT_FOUND", 500, "积分账户不存在");
    }

    return {
      balance: account.balance,
      reserved: account.reserved,
      available: account.balance - account.reserved
    };
  }
}
