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
    applyProtectedMediaHeaders(reply, content, "inline");
    await reply.send(content.body);
  }

  @Get(":uploadId/download")
  @ApiOperation({ summary: "Download protected upload content" })
  async download(
    @CurrentAuth() auth: AuthContext,
    @Param("uploadId") uploadId: string,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const content = await this.platform.uploads.getDownload(auth, uploadId);
    applyProtectedMediaHeaders(reply, content, "attachment");
    await reply.send(content.body);
  }
}

function applyProtectedMediaHeaders(
  reply: FastifyReply,
  content: { contentType: string; originalName: string },
  disposition: "inline" | "attachment"
): void {
  const filename = encodeURIComponent(content.originalName).replaceAll("'", "%27");
  reply.header("content-type", content.contentType);
  reply.header("content-disposition", `${disposition}; filename*=UTF-8''${filename}`);
  reply.header("cache-control", "private, max-age=300");
  reply.header("x-content-type-options", "nosniff");
}
