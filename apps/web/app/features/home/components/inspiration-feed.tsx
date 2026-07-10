import { useEffect, useRef } from "react";
import type { HomeFeedItemDto } from "@ai-studio/contracts";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";

const CHANNELS = ["推荐", "平面设计", "电商", "摄影", "建筑", "角色", "3D"];

interface InspirationFeedProps {
  channel: string;
  onChannelChange: (channel: string) => void;
  items: HomeFeedItemDto[];
  loading: boolean;
  fetchingMore: boolean;
  onLoadMore: () => void;
}

export function InspirationFeed({
  channel,
  onChannelChange,
  items,
  loading,
  fetchingMore,
  onLoadMore
}: InspirationFeedProps) {
  const channelRailRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "500px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore]);

  const scrollChannels = (direction: -1 | 1) => {
    channelRailRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <section className="home-section inspiration-section" id="inspiration">
      <div className="section-heading section-heading--channels">
        <div>
          <p>COMMUNITY CHANNELS</p>
          <h2>灵感频道</h2>
        </div>
        <div className="channel-controls">
          <button
            type="button"
            title="向左滚动"
            aria-label="向左滚动频道"
            onClick={() => scrollChannels(-1)}
          >
            <ChevronLeft className="ui-icon" size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="向右滚动"
            aria-label="向右滚动频道"
            onClick={() => scrollChannels(1)}
          >
            <ChevronRight className="ui-icon" size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="channel-rail" ref={channelRailRef} role="tablist">
        {CHANNELS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={channel === item}
            className={channel === item ? "is-active" : ""}
            onClick={() => onChannelChange(item)}
          >
            <span
              className={`channel-swatch channel-swatch--${CHANNELS.indexOf(item)}`}
              aria-hidden="true"
            >
              {item === "推荐" ? (
                <LayoutGrid className="ui-icon" size={18} strokeWidth={2} aria-hidden="true" />
              ) : null}
            </span>
            <strong>{item === "推荐" ? "所有频道" : item}</strong>
          </button>
        ))}
      </div>

      {loading ? <div className="feed-loading">正在加载灵感</div> : null}
      <div className="inspiration-grid">
        {items.map((item) => (
          <article className="inspiration-item" key={item.id}>
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              style={{ aspectRatio: String(item.aspectRatio) }}
            />
            <div className="inspiration-item__meta">
              <strong>{item.title}</strong>
              <span>{item.author}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="feed-sentinel" ref={loadMoreRef} aria-hidden="true">
        {fetchingMore ? "加载中" : ""}
      </div>
    </section>
  );
}
