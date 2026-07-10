import { ApplicationError } from "../application/application-error.js";
import type { RewriteNodeEnvironment } from "../config/rewrite-config.js";

export type ModerationDecision = "passed" | "blocked";
export type NotificationChannel = "email" | "sms" | "in_app";

export interface ModerationProvider {
  inspect(input: { subjectType: string; subjectId: string; contentHash: string }): Promise<{
    decision: ModerationDecision;
    provider: string;
    result: Record<string, unknown>;
  }>;
}

export interface NotificationProvider {
  deliver(input: {
    channel: NotificationChannel;
    recipient: string;
    templateKey: string;
    payload: Record<string, unknown>;
  }): Promise<{ provider: string; providerReference: string | null }>;
}

export interface ComplianceProviders {
  moderation: ModerationProvider;
  notification: NotificationProvider;
}

export function createComplianceProviders(environment: RewriteNodeEnvironment): ComplianceProviders {
  if (environment === "production") {
    return {
      moderation: new UnconfiguredModerationProvider(),
      notification: new UnconfiguredNotificationProvider()
    };
  }

  return {
    moderation: new DevelopmentModerationProvider(),
    notification: new DevelopmentNotificationProvider()
  };
}

class DevelopmentModerationProvider implements ModerationProvider {
  async inspect(): Promise<{
    decision: "passed";
    provider: "development";
    result: { checked: true };
  }> {
    return { decision: "passed", provider: "development", result: { checked: true } };
  }
}

class DevelopmentNotificationProvider implements NotificationProvider {
  async deliver(): Promise<{ provider: "development"; providerReference: null }> {
    return { provider: "development", providerReference: null };
  }
}

class UnconfiguredModerationProvider implements ModerationProvider {
  async inspect(): Promise<never> {
    throwProviderNotConfigured();
  }
}

class UnconfiguredNotificationProvider implements NotificationProvider {
  async deliver(): Promise<never> {
    throwProviderNotConfigured();
  }
}

function throwProviderNotConfigured(): never {
  throw new ApplicationError("PROVIDER_NOT_CONFIGURED", 503, "生产 Provider 尚未配置");
}
