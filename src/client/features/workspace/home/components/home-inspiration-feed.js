const CARD_HEIGHTS = [280, 190, 240, 320, 210, 260, 360, 220, 300, 250, 410, 230];
const BATCH_SIZE = 24;
const INITIAL_SIZE = 36;
const LOAD_THRESHOLD = 900;

const FALLBACK_CHANNEL = { id: "general", label: "全部", tone: "#d1d5db" };

export function initHomeInspirationFeed(root = document) {
  const homeView = root.querySelector("#homeView");
  const feed = root.querySelector("#homeInspirationFeed");
  const loading = root.querySelector("#homeInspirationLoading");
  const channelShell = root.querySelector(".home-channel-shell");
  const channelStrip = root.querySelector(".home-channel-strip");
  const allChannel = root.querySelector(".home-channel-all");
  const channelPrev = root.querySelector(".home-channel-scroll.prev");
  const channelNext = root.querySelector(".home-channel-scroll.next");
  if (!homeView || !feed || feed.dataset.boundInspirationFeed === "true") {
    return { destroy() {} };
  }

  let cardCount = 0;
  let rafId = 0;
  let activeChannel = "all";
  let lastScrollTop = homeView.scrollTop;

  const getChannelMeta = () => Array.from(channelStrip?.querySelectorAll("button[data-channel]") || []).map((button) => {
    const toneSource = button.querySelector("i");
    const tone = toneSource
      ? getComputedStyle(toneSource).getPropertyValue("--tone").trim() || toneSource.style.getPropertyValue("--tone")
      : "";
    return {
      id: button.dataset.channel,
      label: button.textContent.trim(),
      tone: tone || FALLBACK_CHANNEL.tone
    };
  });

  const resolveCardChannel = (index) => {
    const channels = getChannelMeta();
    if (activeChannel === "all") {
      return channels[index % Math.max(1, channels.length)] || FALLBACK_CHANNEL;
    }
    return channels.find((channel) => channel.id === activeChannel) || {
      id: activeChannel,
      label: activeChannel,
      tone: FALLBACK_CHANNEL.tone
    };
  };

  const createCard = (index) => {
    const channel = resolveCardChannel(index);
    const card = root.createElement("article");
    card.className = "home-masonry-card";
    card.style.setProperty("--card-height", `${CARD_HEIGHTS[index % CARD_HEIGHTS.length]}px`);
    card.style.setProperty("--card-tone", channel.tone);
    card.setAttribute("aria-label", `${channel.label} 用户作品 ${index + 1}`);
    card.dataset.inspirationIndex = String(index);
    card.dataset.channel = channel.id;
    return card;
  };

  const appendCards = (count = BATCH_SIZE) => {
    const fragment = root.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.append(createCard(cardCount));
      cardCount += 1;
    }
    feed.append(fragment);
  };

  const resetFeed = (channel = activeChannel) => {
    activeChannel = channel;
    cardCount = 0;
    feed.dataset.activeChannel = activeChannel;
    feed.replaceChildren();
    appendCards(INITIAL_SIZE);
  };

  const maybeAppend = () => {
    rafId = 0;
    const distanceToBottom = homeView.scrollHeight - homeView.scrollTop - homeView.clientHeight;
    if (distanceToBottom <= LOAD_THRESHOLD) {
      loading?.classList.add("show");
      appendCards(BATCH_SIZE);
      requestAnimationFrame(() => loading?.classList.remove("show"));
    }
  };

  const syncChannelShellVisibility = () => {
    if (!channelShell) return;
    const currentScrollTop = homeView.scrollTop;
    const feedRect = feed.getBoundingClientRect();
    const viewRect = homeView.getBoundingClientRect();
    const isInImageFeed = feedRect.top <= viewRect.top + 8;
    const isScrollingDown = currentScrollTop > lastScrollTop + 4;
    const isScrollingUp = currentScrollTop < lastScrollTop - 4;

    channelShell.classList.toggle("is-floating", isInImageFeed);
    if (!isInImageFeed) {
      channelShell.classList.remove("is-hidden");
    } else if (isScrollingDown) {
      channelShell.classList.add("is-hidden");
    } else if (isScrollingUp) {
      channelShell.classList.remove("is-hidden");
    }
    lastScrollTop = currentScrollTop;
  };

  const onScroll = () => {
    syncChannelShellVisibility();
    if (!rafId) rafId = requestAnimationFrame(maybeAppend);
  };

  const onChannelClick = (event) => {
    const button = event.target.closest("button[data-channel]");
    if (!button || !channelStrip?.contains(button)) return;
    channelStrip.querySelectorAll("button.active").forEach((item) => item.classList.remove("active"));
    allChannel?.classList.remove("active");
    button.classList.add("active");
    resetFeed(button.dataset.channel);
  };

  const onAllChannelClick = () => {
    channelStrip?.querySelectorAll("button.active").forEach((item) => item.classList.remove("active"));
    allChannel?.classList.add("active");
    if (channelStrip) channelStrip.scrollTo({ left: 0, behavior: "smooth" });
    resetFeed("all");
  };

  const scrollChannels = (direction) => {
    channelStrip?.scrollBy({
      left: direction * Math.max(320, Math.round(channelStrip.clientWidth * 0.72)),
      behavior: "smooth"
    });
  };

  const onPrevChannel = () => scrollChannels(-1);
  const onNextChannel = () => scrollChannels(1);

  feed.dataset.boundInspirationFeed = "true";
  resetFeed("all");
  syncChannelShellVisibility();
  homeView.addEventListener("scroll", onScroll, { passive: true });
  channelStrip?.addEventListener("click", onChannelClick);
  allChannel?.addEventListener("click", onAllChannelClick);
  channelPrev?.addEventListener("click", onPrevChannel);
  channelNext?.addEventListener("click", onNextChannel);

  return {
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      homeView.removeEventListener("scroll", onScroll);
      channelStrip?.removeEventListener("click", onChannelClick);
      allChannel?.removeEventListener("click", onAllChannelClick);
      channelPrev?.removeEventListener("click", onPrevChannel);
      channelNext?.removeEventListener("click", onNextChannel);
      delete feed.dataset.boundInspirationFeed;
    }
  };
}
