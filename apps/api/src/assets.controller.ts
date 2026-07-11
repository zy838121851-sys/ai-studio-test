import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@ai-studio/server-core";

import { CurrentAuth, SessionAuthGuard } from "./auth/auth-context.js";
import { PlatformService } from "./platform.service.js";

@ApiTags("assets")
@Controller("assets")
@UseGuards(SessionAuthGuard)
export class AssetsController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Get()
  @ApiOperation({ summary: "List workspace assets" })
  list(@CurrentAuth() auth: AuthContext) { return this.platform.assets.list(auth); }

  @Get("collections")
  @ApiOperation({ summary: "List workspace asset collections" })
  collections(@CurrentAuth() auth: AuthContext) { return this.platform.assets.listCollections(auth); }

  @Post("collections")
  @ApiOperation({ summary: "Create a workspace asset collection" })
  createCollection(@CurrentAuth() auth: AuthContext, @Body() body: { name?: string }) { return this.platform.assets.createCollection(auth, body.name ?? ""); }

  @Post("uploads/:uploadId")
  @ApiOperation({ summary: "Register a protected upload as a workspace asset" })
  addUpload(@CurrentAuth() auth: AuthContext, @Param("uploadId") uploadId: string) { return this.platform.assets.addUpload(auth, uploadId); }

  @Patch(":assetId")
  @ApiOperation({ summary: "Move or favorite a workspace asset" })
  update(@CurrentAuth() auth: AuthContext, @Param("assetId") assetId: string, @Body() body: { collectionId?: string | null; favorite?: boolean }) { return this.platform.assets.update(auth, assetId, body); }

  @Delete(":assetId")
  @ApiOperation({ summary: "Remove a workspace asset record" })
  remove(@CurrentAuth() auth: AuthContext, @Param("assetId") assetId: string) { return this.platform.assets.remove(auth, assetId); }
}
