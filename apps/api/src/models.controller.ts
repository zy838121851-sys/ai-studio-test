import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CreditQuoteDto, ModelCatalogEntryDto } from "@ai-studio/contracts";
import { listModels, quoteModel } from "@ai-studio/server-core";

@ApiTags("models")
@Controller("models")
export class ModelsController {
  @Get()
  @ApiOperation({ summary: "List the public model catalog" })
  list(): ModelCatalogEntryDto[] {
    return listModels();
  }

  @Get("quote")
  @ApiOperation({ summary: "Quote credits for a model request" })
  quote(@Query("modelId") modelId: string, @Query("count") count = "1"): CreditQuoteDto {
    return quoteModel(modelId, Number(count));
  }
}
