import type {
  CapabilityAvailabilityReasonDto,
  CapabilityCategoryDto,
  CapabilityDto,
  CapabilityIdDto,
  CapabilityRegistryDto,
  CapabilityStatusDto
} from "@ai-studio/contracts";

import { ApplicationError } from "../application/application-error.js";
import type { RewriteConfig, RewriteNodeEnvironment } from "../config/rewrite-config.js";

export const CAPABILITY_STATUSES = [
  "disabled",
  "development",
  "configured",
  "verified"
] as const satisfies readonly CapabilityStatusDto[];

const DEFINITIONS: readonly { id: CapabilityIdDto; category: CapabilityCategoryDto }[] = [
  { id: "object-storage", category: "storage" },
  { id: "image-generation", category: "ai" },
  { id: "email-identity", category: "identity" },
  { id: "sms-identity", category: "identity" },
  { id: "wechat-oauth", category: "identity" },
  { id: "qq-oauth", category: "identity" },
  { id: "captcha", category: "safety" },
  { id: "risk-control", category: "safety" },
  { id: "content-moderation", category: "safety" },
  { id: "email-notification", category: "notification" },
  { id: "sms-notification", category: "notification" },
  { id: "audit-log", category: "audit" },
  { id: "wechat-pay", category: "billing" },
  { id: "alipay", category: "billing" },
  { id: "automatic-renewal", category: "billing" }
];

type CapabilityStatuses = Partial<Record<CapabilityIdDto, CapabilityStatusDto>>;

export class CapabilityRegistry {
  private readonly capabilities: ReadonlyMap<CapabilityIdDto, CapabilityDto>;

  constructor(environment: RewriteNodeEnvironment, statuses: CapabilityStatuses = {}) {
    this.capabilities = new Map(
      DEFINITIONS.map(({ id, category }) => {
        const status = statuses[id] ?? "disabled";
        const availability = resolveAvailability(environment, status);
        return [
          id,
          {
            id,
            category,
            status,
            actionAllowed: availability.actionAllowed,
            reason: availability.reason
          }
        ];
      })
    );
    this.environment = environment;
  }

  readonly environment: RewriteNodeEnvironment;

  toDto(): CapabilityRegistryDto {
    return {
      environment: this.environment,
      capabilities: DEFINITIONS.map(({ id }) => ({ ...this.get(id) }))
    };
  }

  get(id: CapabilityIdDto): CapabilityDto {
    const capability = this.capabilities.get(id);
    if (!capability) throw new Error(`Unknown capability: ${id}`);
    return capability;
  }

  assertActionAllowed(id: CapabilityIdDto): void {
    const capability = this.get(id);
    if (capability.actionAllowed) return;

    const code =
      capability.status === "disabled"
        ? "PROVIDER_NOT_CONFIGURED"
        : capability.status === "development"
          ? "DEVELOPMENT_PROVIDER_NOT_ALLOWED"
          : "PROVIDER_NOT_VERIFIED";
    throw new ApplicationError(code, 503, "The requested capability is not available.", {
      capabilityId: id,
      status: capability.status
    });
  }
}

export function createCapabilityRegistry(config: RewriteConfig): CapabilityRegistry {
  const hasDevelopmentIdentityProviders = config.nodeEnvironment !== "production";
  return new CapabilityRegistry(config.nodeEnvironment, {
    "object-storage": config.storage.provider === "local" ? "development" : "configured",
    "image-generation":
      config.imageProvider.provider === "development" ? "development" : "configured",
    "email-identity": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "sms-identity": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "wechat-oauth": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "qq-oauth": hasDevelopmentIdentityProviders ? "development" : "disabled",
    captcha: hasDevelopmentIdentityProviders ? "development" : "disabled",
    "risk-control": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "content-moderation": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "email-notification": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "sms-notification": hasDevelopmentIdentityProviders ? "development" : "disabled",
    "audit-log": hasDevelopmentIdentityProviders ? "development" : "disabled"
  });
}

function resolveAvailability(
  environment: RewriteNodeEnvironment,
  status: CapabilityStatusDto
): { actionAllowed: boolean; reason: CapabilityAvailabilityReasonDto } {
  if (status === "disabled") {
    return { actionAllowed: false, reason: "provider-disabled" };
  }
  if (environment !== "production" || status === "verified") {
    return { actionAllowed: true, reason: "available" };
  }
  if (status === "development") {
    return { actionAllowed: false, reason: "development-provider-not-allowed" };
  }
  return { actionAllowed: false, reason: "live-verification-required" };
}
