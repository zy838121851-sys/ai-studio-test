import type { RewriteConfig } from "../config/rewrite-config.js";
import { ApimartImageProvider } from "./apimart-image-provider.js";
import { DevelopmentImageProvider } from "./development-image-provider.js";

export interface ImageReference {
  contentType: string;
  body: Buffer;
}

export interface GenerateImageRequest {
  jobId: string;
  modelId: string;
  prompt: string;
  references: ImageReference[];
}

export interface GeneratedImage {
  body: Buffer;
  contentType: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  readonly name: "development" | "apimart";
  generate(request: GenerateImageRequest): Promise<GeneratedImage>;
}

export function createImageProvider(config: RewriteConfig): ImageProvider {
  return config.imageProvider.provider === "development"
    ? new DevelopmentImageProvider()
    : new ApimartImageProvider(config.imageProvider.apiKey, config.imageProvider.baseUrl);
}
