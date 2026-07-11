import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateAiJobDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiProperty({ example: "gpt-image-2" })
  @IsString()
  modelId!: string;

  @ApiProperty({ minLength: 1, maxLength: 8000 })
  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  prompt!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  uploadIds: string[] = [];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transformSourceNodeId?: string;

  @ApiPropertyOptional({ enum: ["crop", "upscale", "remove-background", "expand", "edit-text"] })
  @IsOptional()
  @IsIn(["crop", "upscale", "remove-background", "expand", "edit-text"])
  transformKind?: "crop" | "upscale" | "remove-background" | "expand" | "edit-text";
}
