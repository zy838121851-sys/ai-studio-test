import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { PaginatedHomeFeedDto } from "@ai-studio/contracts";
import { listHomeFeed } from "@ai-studio/server-core";

@ApiTags("home")
@Controller("home")
export class HomeController {
  @Get("feed")
  @ApiOperation({ summary: "Return a cursor-paginated inspiration feed" })
  getFeed(
    @Query("channel") channel: string | undefined,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit = "12"
  ): PaginatedHomeFeedDto {
    return listHomeFeed(channel, cursor, Number(limit));
  }
}
