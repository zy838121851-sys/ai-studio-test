import type { PaginatedHomeFeedDto } from "@ai-studio/contracts";

const CHANNELS = ["推荐", "平面设计", "电商", "摄影", "建筑", "角色", "3D"] as const;
const IMAGE_URLS = [
  "/inspiration/inspiration-1.jpg",
  "/inspiration/inspiration-2.jpg",
  "/inspiration/inspiration-3.jpg",
  "/inspiration/inspiration-4.jpg",
  "/inspiration/inspiration-5.jpg",
  "/inspiration/inspiration-6.jpg"
] as const;

export function listHomeFeed(
  channel: string | undefined,
  cursor: string | undefined,
  limitInput: number
): PaginatedHomeFeedDto {
  const limit = Math.min(Math.max(Math.trunc(limitInput), 1), 24);
  const offset = parseCursor(cursor);
  const normalizedChannel = CHANNELS.includes(channel as (typeof CHANNELS)[number])
    ? (channel as (typeof CHANNELS)[number])
    : "推荐";
  const items = Array.from({ length: limit }, (_, index) => {
    const absoluteIndex = offset + index;
    const assignedChannel = CHANNELS[(absoluteIndex % (CHANNELS.length - 1)) + 1] ?? "平面设计";

    return {
      id: `inspiration-${absoluteIndex}`,
      channel: normalizedChannel === "推荐" ? assignedChannel : normalizedChannel,
      title: `灵感创作 ${absoluteIndex + 1}`,
      author: `Creator ${String((absoluteIndex % 12) + 1).padStart(2, "0")}`,
      imageUrl: IMAGE_URLS[absoluteIndex % IMAGE_URLS.length] ?? IMAGE_URLS[0],
      aspectRatio: [0.8, 1, 1.2, 0.72, 1.4][absoluteIndex % 5] ?? 1
    };
  });

  return {
    items,
    nextCursor: String(offset + limit)
  };
}

function parseCursor(cursor: string | undefined): number {
  const value = Number(cursor ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
