import { IsIn, IsUUID } from "class-validator";

export class CreateOrderPaymentDto {
  @IsUUID()
  priceId!: string;

  @IsIn(["wechat", "alipay"])
  provider!: "wechat" | "alipay";
}

export class CreateRefundDto {
  @IsUUID()
  paymentId!: string;

  amountFen!: number;
  reason = "";
}

export class CreateInvoiceRequestDto {
  @IsUUID()
  orderId!: string;
  invoiceType!: string;
  recipient!: Record<string, unknown>;
}
