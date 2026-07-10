import { describe, expect, it } from "vitest";

import { createIdentityProviders } from "./identity-providers.js";

describe("identity provider seams", () => {
  it("uses deterministic development implementations", async () => {
    const providers = createIdentityProviders("development");

    await expect(
      providers.emailCode.deliver({
        target: "creator@example.com",
        code: "123456",
        purpose: "register"
      })
    ).resolves.toEqual({ developmentCode: "123456" });
    await expect(
      providers.wechatOAuth.exchangeAuthorizationCode({ authorizationCode: "dev-code" })
    ).resolves.toEqual({
      provider: "wechat",
      subject: "development:wechat:dev-code",
      email: null
    });
    await expect(providers.captcha.verify({ token: undefined, action: "register" })).resolves.toEqual({
      passed: true
    });
    await expect(
      providers.risk.assess({ action: "register", email: "creator@example.com", ipAddress: undefined })
    ).resolves.toEqual({ allowed: true, reason: "development-allow" });
  });

  it("fails closed for every unconfigured production provider", async () => {
    const providers = createIdentityProviders("production");

    await expect(
      providers.emailCode.deliver({ target: "creator@example.com", code: "123456", purpose: "register" })
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(
      providers.smsCode.deliver({ target: "13800138000", code: "123456", purpose: "register" })
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(
      providers.qqOAuth.exchangeAuthorizationCode({ authorizationCode: "provider-code" })
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(providers.captcha.verify({ token: "token", action: "register" })).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
      status: 503
    });
    await expect(
      providers.risk.assess({ action: "register", email: "creator@example.com", ipAddress: undefined })
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
  });
});
