import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ example: "Fresh Ideas" })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ example: "生成一张具有未来感的产品概念图" })
  @IsString()
  @MaxLength(8_000)
  prompt = "";
}

export class UpdateProjectDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  canvasDocument?: Record<string, unknown>;
}
