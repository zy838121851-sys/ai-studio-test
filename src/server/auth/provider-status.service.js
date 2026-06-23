import { env } from "../config/env.js";

function missing(names) {
  return names.filter((name) => !process.env[name]);
}

function status({ provider, required = [], oneOf = [] }) {
  const missingRequired = missing(required);
  const missingOneOf = oneOf.length > 0 && !oneOf.some((name) => process.env[name])
    ? [oneOf.join(" or ")]
    : [];
  const missingRequiredOrOptions = [...missingRequired, ...missingOneOf];
  return {
    provider,
    configured: missingRequiredOrOptions.length === 0,
    missing: missingRequiredOrOptions
  };
}

export function getAuthProviderStatus() {
  const mockCodes = env.nodeEnv === "test" || env.authCodeProvider === "mock";
  const aliyunCodes = env.authCodeProvider === "aliyun";
  const aliyunBase = ["ALIYUN_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_SECRET"];
  const emailRequired = mockCodes
    ? []
    : aliyunCodes
      ? [...aliyunBase, "ALIYUN_DM_ACCOUNT_NAME"]
      : ["AUTH_CODE_PROVIDER"];
  const smsRequired = mockCodes
    ? []
    : aliyunCodes
      ? [...aliyunBase, "ALIYUN_SMS_SIGN_NAME", "ALIYUN_SMS_TEMPLATE_CODE"]
      : ["AUTH_CODE_PROVIDER"];

  return {
    codeProvider: env.authCodeProvider,
    emailCode: status({
      provider: mockCodes ? "mock" : aliyunCodes ? "aliyun-direct-mail" : env.authCodeProvider,
      required: emailRequired
    }),
    smsCode: status({
      provider: mockCodes ? "mock" : aliyunCodes ? "aliyun-sms" : env.authCodeProvider,
      required: smsRequired
    }),
    oauth: {
      wechat: status({
        provider: "wechat",
        required: ["WECHAT_OAUTH_CLIENT_ID", "WECHAT_OAUTH_CLIENT_SECRET"],
        oneOf: ["APP_BASE_URL", "WECHAT_OAUTH_REDIRECT_URI"]
      }),
      qq: status({
        provider: "qq",
        required: ["QQ_OAUTH_CLIENT_ID", "QQ_OAUTH_CLIENT_SECRET"],
        oneOf: ["APP_BASE_URL", "QQ_OAUTH_REDIRECT_URI"]
      })
    }
  };
}

export function getAuthProviderCheck() {
  const providers = getAuthProviderStatus();
  const checks = [
    { name: "emailCode", ...providers.emailCode },
    { name: "smsCode", ...providers.smsCode },
    { name: "wechatOAuth", ...providers.oauth.wechat },
    { name: "qqOAuth", ...providers.oauth.qq }
  ];
  return {
    ok: checks.every((check) => check.configured),
    codeProvider: providers.codeProvider,
    checks
  };
}
