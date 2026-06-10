import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 3000),
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || "",
  dashscopeVisionModel: process.env.DASHSCOPE_VISION_MODEL || "qwen3-vl-plus",
  dashscopeUrl:
    process.env.DASHSCOPE_URL ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
};
