import "dotenv/config";
import { join } from "node:path";

const nodeEnv = process.env.NODE_ENV || "development";

export const env = {
  nodeEnv,
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
  volcengineApiKey: process.env.VOLCENGINE_API_KEY || "",
  volcengineImageUrl:
    process.env.VOLCENGINE_IMAGE_URL ||
    "https://ark.cn-beijing.volces.com/api/v3/images/generations",
  apimartApiKey: process.env.APIMART_API_KEY || "",
  apimartBaseUrl: process.env.APIMART_BASE_URL || "https://api.apimart.ai/v1",
  apimartMock: envFlag("APIMART_MOCK", nodeEnv !== "production"),
  enableApimart: envFlag("ENABLE_APIMART", true),
  enableApimartImage: envFlag("ENABLE_APIMART_IMAGE", true),
  enableApimartVideo: envFlag("ENABLE_APIMART_VIDEO", true),
  enableApimartQwen: envFlag("ENABLE_APIMART_QWEN", true),
  enableApimartDoubao: envFlag("ENABLE_APIMART_DOUBAO", true),
  enableApimartNano: envFlag("ENABLE_APIMART_NANO", true),
  enableApimartGptImage: envFlag("ENABLE_APIMART_GPT_IMAGE", true),
  enableApimartMj: envFlag("ENABLE_APIMART_MJ", true),
  enableApimartSeedance: envFlag("ENABLE_APIMART_SEEDANCE", true),
  enableApimartKling: envFlag("ENABLE_APIMART_KLING", true),
  showOfficialModels: envFlag("SHOW_OFFICIAL_MODELS", false),
  showApimartBrand: envFlag("SHOW_APIMART_BRAND", false),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  maxProxyImageBytes: Number(process.env.MAX_PROXY_IMAGE_BYTES || 10 * 1024 * 1024),
  uploadDir: process.env.UPLOAD_DIR || join(process.cwd(), "uploads"),
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  authCodeProvider: process.env.AUTH_CODE_PROVIDER || "aliyun",
  aliyunAccessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || "",
  aliyunAccessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || "",
  aliyunSmsEndpoint: process.env.ALIYUN_SMS_ENDPOINT || "dysmsapi.aliyuncs.com",
  aliyunSmsSignName: process.env.ALIYUN_SMS_SIGN_NAME || "",
  aliyunSmsTemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || "",
  aliyunDmEndpoint: process.env.ALIYUN_DM_ENDPOINT || "dm.aliyuncs.com",
  aliyunDmAccountName: process.env.ALIYUN_DM_ACCOUNT_NAME || "",
  aliyunDmFromAlias: process.env.ALIYUN_DM_FROM_ALIAS || "AI Studio",
  aliyunDmReplyToAddress: process.env.ALIYUN_DM_REPLY_TO_ADDRESS || "false",
  wechatOAuthClientId: process.env.WECHAT_OAUTH_CLIENT_ID || "",
  wechatOAuthClientSecret: process.env.WECHAT_OAUTH_CLIENT_SECRET || "",
  wechatOAuthRedirectUri: process.env.WECHAT_OAUTH_REDIRECT_URI || "",
  qqOAuthClientId: process.env.QQ_OAUTH_CLIENT_ID || "",
  qqOAuthClientSecret: process.env.QQ_OAUTH_CLIENT_SECRET || "",
  qqOAuthRedirectUri: process.env.QQ_OAUTH_REDIRECT_URI || ""
};

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}
