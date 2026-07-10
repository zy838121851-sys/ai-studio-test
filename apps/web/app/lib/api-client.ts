import type {
  AiJobDto,
  ModelCatalogEntryDto,
  PaginatedHomeFeedDto,
  ProjectDetailDto,
  ProjectSummaryDto,
  SessionDto,
  UploadAssetDto,
  VerificationCodeDto
} from "@ai-studio/contracts";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include"
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readErrorEnvelope(payload);
    throw new ApiClientError(response.status, error.code, error.message);
  }
  return payload as T;
}

export async function getCurrentSession(): Promise<SessionDto | null> {
  try {
    return await request<SessionDto>("/api/v1/auth/me");
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
}

export function sendVerificationCode(email: string): Promise<VerificationCodeDto> {
  return request("/api/v1/auth/verification-code", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function register(input: {
  email: string;
  password: string;
  displayName: string;
  verificationCode: string;
}): Promise<SessionDto> {
  return request("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { email: string; password: string }): Promise<SessionDto> {
  return request("/api/v1/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function logout(): Promise<{ loggedOut: true }> {
  return request("/api/v1/auth/logout", { method: "POST" });
}

export function listModels(): Promise<ModelCatalogEntryDto[]> {
  return request("/api/v1/models");
}

export function listRecentProjects(limit = 12): Promise<ProjectSummaryDto[]> {
  return request(`/api/v1/projects/recent?limit=${limit}`);
}

export function createProject(input: { title: string; prompt: string }): Promise<ProjectDetailDto> {
  return request("/api/v1/projects", { method: "POST", body: JSON.stringify(input) });
}

export function uploadReference(file: File): Promise<UploadAssetDto> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/v1/uploads", { method: "POST", body: form });
}

export function createAiJob(input: {
  projectId: string;
  modelId: string;
  prompt: string;
  uploadIds: string[];
  idempotencyKey: string;
}): Promise<AiJobDto> {
  return request("/api/v1/ai-jobs", {
    method: "POST",
    headers: { "idempotency-key": input.idempotencyKey },
    body: JSON.stringify({
      projectId: input.projectId,
      modelId: input.modelId,
      prompt: input.prompt,
      uploadIds: input.uploadIds
    })
  });
}

export function getHomeFeed(input: {
  channel: string;
  cursor: string | null;
  limit?: number;
}): Promise<PaginatedHomeFeedDto> {
  const parameters = new URLSearchParams({
    channel: input.channel,
    limit: String(input.limit ?? 12)
  });
  if (input.cursor) parameters.set("cursor", input.cursor);
  return request(`/api/v1/home/feed?${parameters.toString()}`);
}

function readErrorEnvelope(payload: unknown): { code: string; message: string } {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === "object") {
      const code = "code" in error ? String(error.code) : "REQUEST_FAILED";
      const message = "message" in error ? String(error.message) : "请求失败";
      return { code, message };
    }
  }
  return { code: "REQUEST_FAILED", message: "请求失败，请稍后重试" };
}
