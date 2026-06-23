import "dotenv/config";
import { join } from "node:path";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || "",
  dashscopeVisionModel: process.env.DASHSCOPE_VISION_MODEL || "qwen3-vl-plus",
  dashscopeUrl:
    process.env.DASHSCOPE_URL ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
  dashscopeImageEditUrl:
    process.env.DASHSCOPE_IMAGE_EDIT_URL ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis",
  dashscopeTaskUrl:
    process.env.DASHSCOPE_TASK_URL ||
    "https://dashscope.aliyuncs.com/api/v1/tasks",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  maxProxyImageBytes: Number(process.env.MAX_PROXY_IMAGE_BYTES || 10 * 1024 * 1024),
  uploadDir: process.env.UPLOAD_DIR || join(process.cwd(), "uploads")
};
