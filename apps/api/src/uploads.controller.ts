import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { UploadAssetDto } from "@ai-studio/contracts";
import { ApplicationError, type AuthContext } from "@ai-studio/server-core";
import type { FastifyReply, FastifyRequest } from "fastify";

import { CurrentAuth, SessionAuthGuard } from "./auth/auth-context.js";
import { PlatformService } from "./platform.service.js";

@ApiTags("uploads")
@Controller("uploads")
@UseGuards(SessionAuthGuard)
export class UploadsController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload one workspace-scoped reference image" })
  async upload(
    @CurrentAuth() auth: AuthContext,
    @Req() request: FastifyRequest
  ): Promise<UploadAssetDto> {
    const file = await request.file();
    if (!file) {
      throw new ApplicationError("UPLOAD_REQUIRED", 400, "请选择要上传的图片");
    }

    return this.platform.uploads.store(auth, {
      originalName: file.filename,
      contentType: file.mimetype,
      body: await file.toBuffer()
    });
  }

  @Get(":uploadId")
  @ApiOperation({ summary: "Get upload metadata" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param("uploadId") uploadId: string
  ): Promise<UploadAssetDto> {
    return this.platform.uploads.get(auth, uploadId);
  }

  @Get(":uploadId/content")
  @ApiOperation({ summary: "Read protected upload content" })
  async getContent(
    @CurrentAuth() auth: AuthContext,
    @Param("uploadId") uploadId: string,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const content = await this.platform.uploads.getContent(auth, uploadId);
    reply.header("content-type", content.contentType);
    reply.header("content-disposition", `inline; filename="${encodeURIComponent(content.originalName)}"`);
    reply.header("cache-control", "private, max-age=300");
    await reply.send(content.body);
  }
}
