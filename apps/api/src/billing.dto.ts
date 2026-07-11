import { IsIn, IsUUID } from "class-validator";

export class CreateOrderPaymentDto {
  @IsUUID()
  priceId!: string;

  @IsIn(["wechat", "alipay"])
  provider!: "wechat" | "alipay";
}
