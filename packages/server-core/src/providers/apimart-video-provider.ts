import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { ApplicationError } from "../application/application-error.js";
import type { ImageReference } from "./image-provider.js";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;
const PROVIDER_MODEL_IDS: Record<string, string> = { "seedance-2": "seedance-2" };

export interface GeneratedVideo {
  body: Buffer;
  contentType: string;
  width: number;
  height: number;
}

export class ApimartVideoProvider {
  constructor(private readonly apiKey: string, private readonly baseUrl: URL) {}

  async generate(input: { jobId: string; modelId: string; prompt: string; references: ImageReference[] }): Promise<GeneratedVideo> {
    const model = PROVIDER_MODEL_IDS[input.modelId];
    if (!model) throw new ApplicationError("APIMART_VIDEO_MODEL_UNSUPPORTED", 400, "Video model mapping is not configured.");
    const imageUrls = input.references.map((reference) => `data:${reference.contentType};base64,${reference.body.toString("base64")}`);
    const created = await this.request("videos/generations", "POST", input.jobId, {
      model,
      prompt: input.prompt,
      ...(imageUrls.length ? { image_urls: imageUrls } : {})
    });
    const taskId = findString(created, ["task_id", "taskId"]);
    if (!taskId) throw new ApplicationError("APIMART_VIDEO_TASK_MISSING", 502, "Video service did not return a task id.");
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await delay(POLL_INTERVAL_MS);
      const result = await this.request(`tasks/${encodeURIComponent(taskId)}?language=zh`, "GET", input.jobId);
      const status = (findString(result, ["status"]) ?? "running").toLowerCase();
      if (["failed", "cancelled", "canceled"].includes(status)) {
        throw new ApplicationError("APIMART_VIDEO_TASK_FAILED", 502, "Video generation task failed.");
      }
      const url = findString(result, ["video_url", "videoUrl", "url"]);
      if (url) return this.download(url);
    }
    throw new ApplicationError("APIMART_VIDEO_TASK_TIMEOUT", 504, "Video generation timed out.");
  }

  private async request(endpoint: string, method: "GET" | "POST", requestId: string, body?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(new URL(endpoint, trailingSlash(this.baseUrl)), {
      method,
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", "x-request-id": requestId },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000)
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApplicationError("APIMART_VIDEO_REQUEST_FAILED", 502, "Video service request failed.");
    return payload;
  }

  private async download(value: string): Promise<GeneratedVideo> {
    const url = await publicHttpsUrl(value);
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const length = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || !contentType.startsWith("video/") || length > MAX_VIDEO_BYTES) {
      throw new ApplicationError("APIMART_VIDEO_OUTPUT_INVALID", 502, "Video service returned an invalid result.");
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (!body.byteLength || body.byteLength > MAX_VIDEO_BYTES) {
      throw new ApplicationError("APIMART_VIDEO_OUTPUT_INVALID", 502, "Video result exceeds the size limit.");
    }
    return { body, contentType, width: 1024, height: 576 };
  }
}

function trailingSlash(url: URL): URL { return new URL(url.href.endsWith("/") ? url.href : `${url.href}/`); }
function delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
function findString(value: unknown, keys: readonly string[], depth = 0): string | null {
  if (depth > 5 || !value) return null;
  if (Array.isArray(value)) return value.map((item) => findString(item, keys, depth + 1)).find(Boolean) ?? null;
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  return Object.values(record).map((item) => findString(item, keys, depth + 1)).find(Boolean) ?? null;
}
async function publicHttpsUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new ApplicationError("REMOTE_VIDEO_URL_REJECTED", 502, "Video result URL is unsafe.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new ApplicationError("REMOTE_VIDEO_URL_REJECTED", 502, "Video result URL is unsafe.");
  return url;
}
function privateAddress(address: string): boolean {
  if (isIP(address) === 4) { const [a = 0, b = 0] = address.split(".").map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); }
  const normalized = address.toLowerCase(); return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}
