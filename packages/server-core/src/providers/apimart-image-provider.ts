import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { ApplicationError } from "../application/application-error.js";
import type {
  GenerateImageRequest,
  GeneratedImage,
  ImageProvider
} from "./image-provider.js";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 3 * 60 * 1_000;

const PROVIDER_MODEL_IDS: Record<string, string> = {
  "gpt-image-2": "gpt-image-2",
  "nano-banana-pro": "gemini-3-pro-image-preview",
  midjourney: "midjourney",
  "qwen-image-2.0-pro": "qwen-image-2.0-pro",
  "seedream-5-lite": "doubao-seedream-5-0-lite"
};

export class ApimartImageProvider implements ImageProvider {
  readonly name = "apimart" as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: URL
  ) {}

  async generate(request: GenerateImageRequest): Promise<GeneratedImage> {
    const model = PROVIDER_MODEL_IDS[request.modelId];
    if (!model) {
      throw new ApplicationError(
        "APIMART_MODEL_UNSUPPORTED",
        400,
        "所选模型尚未配置生产 provider 映射"
      );
    }

    const imageUrls = await Promise.all(
      request.references.map((reference, index) =>
        model === "midjourney"
          ? this.uploadReference(reference, request.jobId, index)
          : Promise.resolve(toDataUrl(reference))
      )
    );
    const endpoint = model === "midjourney" ? "/midjourney/generations" : "/images/generations";
    const payload = await this.requestJson(endpoint, {
      method: "POST",
      body: {
        ...(model === "midjourney" ? {} : { model, n: 1 }),
        prompt: request.prompt,
        size: "1:1",
        ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {})
      },
      requestId: request.jobId
    });
    const imageUrl = extractImageUrl(payload) ?? (await this.pollTask(payload, request.jobId));
    if (!imageUrl) {
      throw new ApplicationError("APIMART_OUTPUT_MISSING", 502, "图像服务未返回结果地址");
    }

    return this.downloadImage(imageUrl);
  }

  async transform(): Promise<GeneratedImage> {
    throw new ApplicationError(
      "IMAGE_TRANSFORM_PROVIDER_NOT_CONFIGURED",
      503,
      "Image transform provider is not configured"
    );
  }

  private async pollTask(initialPayload: unknown, requestId: string): Promise<string | null> {
    const taskId = extractString(initialPayload, ["task_id", "taskId"]);
    if (!taskId) {
      return null;
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await delay(POLL_INTERVAL_MS);
      const payload = await this.requestJson(`/tasks/${encodeURIComponent(taskId)}?language=zh`, {
        method: "GET",
        requestId
      });
      const status = (extractString(payload, ["status"]) ?? "running").toLowerCase();
      if (["failed", "cancelled", "canceled"].includes(status)) {
        throw new ApplicationError("APIMART_TASK_FAILED", 502, "图像服务任务执行失败");
      }
      const imageUrl = extractImageUrl(payload);
      if (imageUrl) {
        return imageUrl;
      }
    }

    throw new ApplicationError("APIMART_TASK_TIMEOUT", 504, "图像服务任务等待超时");
  }

  private async uploadReference(
    reference: GenerateImageRequest["references"][number],
    requestId: string,
    index: number
  ): Promise<string> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([reference.body], { type: reference.contentType }),
      `reference-${index + 1}.${extensionForContentType(reference.contentType)}`
    );
    const response = await fetch(new URL("uploads/images", ensureTrailingSlash(this.baseUrl)), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "x-request-id": requestId
      },
      body: form,
      signal: AbortSignal.timeout(30_000)
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApplicationError("APIMART_UPLOAD_FAILED", 502, "参考图上传到图像服务失败");
    }
    const url = extractImageUrl(payload);
    if (!url) {
      throw new ApplicationError("APIMART_UPLOAD_URL_MISSING", 502, "参考图服务未返回地址");
    }
    return url;
  }

  private async requestJson(
    endpoint: string,
    options: { method: "GET" | "POST"; body?: Record<string, unknown>; requestId: string }
  ): Promise<unknown> {
    const response = await fetch(new URL(endpoint.replace(/^\//, ""), ensureTrailingSlash(this.baseUrl)), {
      method: options.method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "x-request-id": options.requestId
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(30_000)
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok || responseHasError(payload)) {
      throw new ApplicationError("APIMART_REQUEST_FAILED", 502, "图像服务请求失败");
    }
    return payload;
  }

  private async downloadImage(value: string): Promise<GeneratedImage> {
    const url = await assertPublicHttpsUrl(value);
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new ApplicationError("APIMART_DOWNLOAD_FAILED", 502, "生成图片下载失败");
    }
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!contentType.startsWith("image/")) {
      throw new ApplicationError("APIMART_OUTPUT_TYPE_INVALID", 502, "生成结果不是有效图片");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      throw new ApplicationError("APIMART_OUTPUT_TOO_LARGE", 502, "生成图片超过大小限制");
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength < 1 || body.byteLength > MAX_IMAGE_BYTES) {
      throw new ApplicationError("APIMART_OUTPUT_TOO_LARGE", 502, "生成图片超过大小限制");
    }

    return { body, contentType, width: 1024, height: 1024 };
  }
}

function ensureTrailingSlash(url: URL): URL {
  return new URL(url.href.endsWith("/") ? url.href : `${url.href}/`);
}

function toDataUrl(reference: GenerateImageRequest["references"][number]): string {
  return `data:${reference.contentType};base64,${reference.body.toString("base64")}`;
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "png";
}

function responseHasError(payload: unknown): boolean {
  const code = extractNumber(payload, ["code"]);
  return code !== null && code >= 400;
}

function extractImageUrl(payload: unknown): string | null {
  return extractString(payload, ["image_url", "imageUrl", "url"]);
}

function extractString(value: unknown, keys: string[], depth = 0): string | null {
  if (depth > 5 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractString(item, keys, depth + 1);
      if (result) return result;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  for (const candidate of Object.values(record)) {
    const result = extractString(candidate, keys, depth + 1);
    if (result) return result;
  }
  return null;
}

function extractNumber(value: unknown, keys: string[]): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = Number(record[key]);
    if (Number.isFinite(candidate)) return candidate;
  }
  return null;
}

async function assertPublicHttpsUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ApplicationError("REMOTE_IMAGE_URL_REJECTED", 502, "生成结果地址不安全");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new ApplicationError("REMOTE_IMAGE_URL_REJECTED", 502, "生成结果地址不安全");
  }
  return url;
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
