import type { PaginatedHomeFeedDto } from "@ai-studio/contracts";

const CHANNELS = ["推荐", "平面设计", "电商", "摄影", "建筑", "角色", "3D"] as const;
const IMAGE_URLS = [
  "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=900&q=82"
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
