import { ApplicationError } from "../application/application-error.js";
import type { RewriteNodeEnvironment } from "../config/rewrite-config.js";

export type VerificationPurpose = "register";
export type OAuthProviderName = "wechat" | "qq";

export interface VerificationCodeProvider {
  deliver(input: {
    target: string;
    code: string;
    purpose: VerificationPurpose;
  }): Promise<{ developmentCode?: string }>;
}

export interface OAuthIdentityProvider {
  exchangeAuthorizationCode(input: {
    authorizationCode: string;
  }): Promise<{ provider: OAuthProviderName; subject: string; email: string | null }>;
}

export interface CaptchaProvider {
  verify(input: { token: string | undefined; action: string }): Promise<{ passed: boolean }>;
}

export interface RiskProvider {
  assess(input: {
    action: string;
    email: string;
    ipAddress: string | undefined;
  }): Promise<{ allowed: boolean; reason: string }>;
}

export interface IdentityProviders {
  emailCode: VerificationCodeProvider;
  smsCode: VerificationCodeProvider;
  wechatOAuth: OAuthIdentityProvider;
  qqOAuth: OAuthIdentityProvider;
  captcha: CaptchaProvider;
  risk: RiskProvider;
}

export function createIdentityProviders(environment: RewriteNodeEnvironment): IdentityProviders {
  if (environment === "production") return createUnconfiguredProviders();

  return {
    emailCode: new DevelopmentVerificationCodeProvider(),
    smsCode: new DevelopmentVerificationCodeProvider(),
    wechatOAuth: new DevelopmentOAuthProvider("wechat"),
    qqOAuth: new DevelopmentOAuthProvider("qq"),
    captcha: new DevelopmentCaptchaProvider(),
    risk: new DevelopmentRiskProvider()
  };
}

class DevelopmentVerificationCodeProvider implements VerificationCodeProvider {
  async deliver(input: {
    target: string;
    code: string;
    purpose: VerificationPurpose;
  }): Promise<{ developmentCode: string }> {
    return { developmentCode: input.code };
  }
}

class DevelopmentOAuthProvider implements OAuthIdentityProvider {
  constructor(private readonly provider: OAuthProviderName) {}

  async exchangeAuthorizationCode(input: {
    authorizationCode: string;
  }): Promise<{ provider: OAuthProviderName; subject: string; email: string | null }> {
    const code = input.authorizationCode.trim();
    if (!code) throw new ApplicationError("INVALID_OAUTH_CODE", 400, "授权码无效");
    return {
      provider: this.provider,
      subject: `development:${this.provider}:${code}`,
      email: null
    };
  }
}

class DevelopmentCaptchaProvider implements CaptchaProvider {
  async verify(): Promise<{ passed: true }> {
    return { passed: true };
  }
}

class DevelopmentRiskProvider implements RiskProvider {
  async assess(): Promise<{ allowed: true; reason: "development-allow" }> {
    return { allowed: true, reason: "development-allow" };
  }
}

function createUnconfiguredProviders(): IdentityProviders {
  return {
    emailCode: new UnconfiguredVerificationCodeProvider(),
    smsCode: new UnconfiguredVerificationCodeProvider(),
    wechatOAuth: new UnconfiguredOAuthProvider(),
    qqOAuth: new UnconfiguredOAuthProvider(),
    captcha: new UnconfiguredCaptchaProvider(),
    risk: new UnconfiguredRiskProvider()
  };
}

class UnconfiguredVerificationCodeProvider implements VerificationCodeProvider {
  async deliver(): Promise<never> {
    throwProviderNotConfigured();
  }
}

class UnconfiguredOAuthProvider implements OAuthIdentityProvider {
  async exchangeAuthorizationCode(): Promise<never> {
    throwProviderNotConfigured();
  }
}

class UnconfiguredCaptchaProvider implements CaptchaProvider {
  async verify(): Promise<never> {
    throwProviderNotConfigured();
  }
}

class UnconfiguredRiskProvider implements RiskProvider {
  async assess(): Promise<never> {
    throwProviderNotConfigured();
  }
}

function throwProviderNotConfigured(): never {
  throw new ApplicationError("PROVIDER_NOT_CONFIGURED", 503, "生产 Provider 尚未配置");
}
