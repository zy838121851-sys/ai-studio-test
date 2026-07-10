export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export interface ServiceHealth {
  service: "ai-studio-rewrite-api";
  status: "ok" | "degraded";
  dependencies?: {
    database: "ready" | "unavailable";
    redis: "ready" | "unavailable";
    storage: "ready" | "unavailable";
  };
}

export type CapabilityStatusDto = "disabled" | "development" | "configured" | "verified";

export type CapabilityIdDto =
  | "object-storage"
  | "image-generation"
  | "email-identity"
  | "sms-identity"
  | "wechat-oauth"
  | "qq-oauth"
  | "captcha"
  | "risk-control"
  | "content-moderation"
  | "email-notification"
  | "sms-notification"
  | "audit-log"
  | "wechat-pay"
  | "alipay"
  | "automatic-renewal";

export type CapabilityCategoryDto =
  | "storage"
  | "ai"
  | "identity"
  | "safety"
  | "notification"
  | "audit"
  | "billing";

export type CapabilityAvailabilityReasonDto =
  | "available"
  | "provider-disabled"
  | "development-provider-not-allowed"
  | "live-verification-required";

export interface CapabilityDto {
  id: CapabilityIdDto;
  category: CapabilityCategoryDto;
  status: CapabilityStatusDto;
  actionAllowed: boolean;
  reason: CapabilityAvailabilityReasonDto;
}

export interface CapabilityRegistryDto {
  environment: "development" | "test" | "production";
  capabilities: CapabilityDto[];
}

export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  workspaceId: string;
  workspaceName: string;
}

export interface SessionDto {
  user: AuthUserDto;
  credits: CreditBalanceDto;
}

export interface VerificationCodeDto {
  delivered: true;
  expiresInSeconds: number;
  developmentCode?: string;
}

export type ModelModality = "image" | "video" | "3d";

export interface ModelCatalogEntryDto {
  id: string;
  label: string;
  modality: ModelModality;
  group: string;
  description: string;
  capabilities: string[];
  creditCost: number;
  estimatedSeconds: number;
  outputCount: number;
  isDefault: boolean;
  enabled: boolean;
}

export interface CreditBalanceDto {
  balance: number;
  reserved: number;
  available: number;
}

export interface CreditQuoteDto {
  modelId: string;
  count: number;
  unitCredits: number;
  totalCredits: number;
}

export interface CanvasNodeDto {
  id: string;
  kind: "pending-image" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  jobId?: string;
  sourceUrl?: string;
  alt?: string;
}

export interface CanvasDocumentDto {
  schemaVersion: 1;
  projectId: string;
  nodes: CanvasNodeDto[];
}

export interface ProjectSummaryDto {
  id: string;
  title: string;
  prompt: string;
  thumbnailUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailDto extends ProjectSummaryDto {
  canvasDocument: CanvasDocumentDto;
}

export interface UploadAssetDto {
  id: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  url: string;
  createdAt: string;
}

export type AiJobStatusDto = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface AiJobOutputDto {
  uploadId: string;
  url: string;
  width: number;
  height: number;
}

export interface AiJobDto {
  id: string;
  projectId: string;
  modelId: string;
  status: AiJobStatusDto;
  prompt: string;
  reservedCredits: number;
  chargedCredits: number;
  output: AiJobOutputDto | null;
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomeFeedItemDto {
  id: string;
  channel: string;
  title: string;
  author: string;
  imageUrl: string;
  aspectRatio: number;
}

export interface PaginatedHomeFeedDto {
  items: HomeFeedItemDto[];
  nextCursor: string | null;
}
