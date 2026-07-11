import { Body, Controller, Headers, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { OrderPaymentDto } from "@ai-studio/contracts";
import { ApplicationError } from "@ai-studio/server-core";
import type { AuthContext, PaymentProviderName } from "@ai-studio/server-core";

import { CurrentAuth, SessionAuthGuard } from "./auth/auth-context.js";
import type { CreateOrderPaymentDto } from "./billing.dto.js";
import { PlatformService } from "./platform.service.js";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Post("orders")
  @UseGuards(SessionAuthGuard)
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOperation({ summary: "Create one provider-neutral payment attempt" })
  createOrder(
    @CurrentAuth() auth: AuthContext,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateOrderPaymentDto
  ): Promise<OrderPaymentDto> {
    if (!idempotencyKey) throw new ApplicationError("IDEMPOTENCY_KEY_REQUIRED", 400, "Idempotency-Key is required.");
    return this.platform.orderPayments.create(auth, { ...body, idempotencyKey });
  }

  @Post("webhooks/:provider")
  @ApiHeader({ name: "X-Payment-Signature", required: true })
  @ApiHeader({ name: "X-Payment-Timestamp", required: true })
  @ApiHeader({ name: "X-Payment-Nonce", required: true })
  @ApiOperation({ summary: "Verify and process a payment provider webhook" })
  processWebhook(
    @Param("provider") provider: string,
    @Headers("x-payment-signature") signature: string | undefined,
    @Headers("x-payment-timestamp") timestamp: string | undefined,
    @Headers("x-payment-nonce") nonce: string | undefined,
    @Headers("wechatpay-serial") serial: string | undefined,
    @Body() body: Record<string, unknown>
  ): Promise<{ duplicate: boolean }> {
    if (!isPaymentProviderName(provider) || !signature || !timestamp || !nonce) {
      throw new ApplicationError("INVALID_PAYMENT_WEBHOOK", 400, "Invalid payment webhook.");
    }
    return this.platform.orderPayments.processWebhook({
      provider,
      signature,
      timestamp,
      nonce,
      ...(serial ? { serial } : {}),
      body: JSON.stringify(body)
    });
  }
}

function isPaymentProviderName(value: string): value is PaymentProviderName {
  return value === "wechat" || value === "alipay" || value === "renewal";
}
