import { createHash } from "node:crypto";

import type { GenerateImageRequest, GeneratedImage, ImageProvider } from "./image-provider.js";

export class DevelopmentImageProvider implements ImageProvider {
  readonly name = "development" as const;

  async generate(request: GenerateImageRequest): Promise<GeneratedImage> {
    const colors = colorPair(request.prompt);
    const prompt = escapeXml(request.prompt.slice(0, 140));
    const model = escapeXml(request.modelId);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <defs>
          <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${colors[0]}" />
            <stop offset="1" stop-color="${colors[1]}" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#background)" />
        <circle cx="790" cy="210" r="170" fill="rgba(255,255,255,.2)" />
        <rect x="80" y="650" width="864" height="250" rx="28" fill="rgba(12,18,28,.72)" />
        <text x="120" y="720" fill="#ffffff" font-family="Arial, sans-serif" font-size="28">AI Studio development result</text>
        <text x="120" y="776" fill="#ffffff" font-family="Arial, sans-serif" font-size="34">${prompt}</text>
        <text x="120" y="850" fill="rgba(255,255,255,.72)" font-family="Arial, sans-serif" font-size="22">${model} · ${escapeXml(request.jobId.slice(0, 8))}</text>
      </svg>
    `.trim();

    return {
      body: Buffer.from(svg, "utf8"),
      contentType: "image/svg+xml",
      width: 1024,
      height: 1024
    };
  }
}

function colorPair(input: string): [string, string] {
  const digest = createHash("sha256").update(input).digest();
  const first = `hsl(${digest[0] ?? 0} 72% 58%)`;
  const second = `hsl(${((digest[1] ?? 0) + 120) % 360} 62% 42%)`;
  return [first, second];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
