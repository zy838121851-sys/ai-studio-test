import { env } from "../../config/env.js";
import { assertPublicHttpUrl } from "../../security/network.js";

export async function proxyImage({
  url = ""
} = {}) {
  const safeUrl = await assertPublicHttpUrl(url);
  const upstream = await fetch(safeUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(10000)
  });
  if (!upstream.ok) {
    return {
      status: upstream.status,
      message: "Unable to fetch image"
    };
  }
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return {
      status: 415,
      message: "URL did not return an image"
    };
  }
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength && contentLength > env.maxProxyImageBytes) {
    return {
      status: 413,
      message: "Image is too large"
    };
  }
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.length > env.maxProxyImageBytes) {
    return {
      status: 413,
      message: "Image is too large"
    };
  }
  return {
    buffer,
    contentType,
    cacheControl: "private, max-age=300"
  };
}
