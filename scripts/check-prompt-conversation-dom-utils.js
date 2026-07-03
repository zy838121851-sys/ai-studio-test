import {
  clearConversationChatLog,
  closeConversationHistoryPopover,
  ensureConversationHistoryPopover,
  getConversationHistoryPopoverPosition,
  positionConversationHistoryPopover
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-dom-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const chatLog = { innerHTML: "<p>existing</p>" };
const root = {
  querySelector(selector) {
    return selector === "#chatLog" ? chatLog : null;
  }
};

assert(clearConversationChatLog(root) === true, "Conversation chat log clear should report cleared logs");
assert(chatLog.innerHTML === "", "Conversation chat log clear should empty the chat log markup");

const missingRoot = {
  querySelector() {
    return null;
  }
};
assert(clearConversationChatLog(missingRoot) === false, "Conversation chat log clear should report missing logs");
assert(clearConversationChatLog(null) === false, "Conversation chat log clear should tolerate missing roots");

const popoverListeners = [];
const viewportListeners = [];
const popoverRoot = {
  popover: null,
  body: {
    append(node) {
      popoverRoot.popover = node;
    }
  },
  querySelector(selector) {
    return selector === "#conversationHistoryPopover" ? this.popover : null;
  },
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      id: "",
      className: "",
      hidden: false,
      style: {}
    };
  },
  addEventListener(type, listener) {
    popoverListeners.push({ type, listener });
  }
};
const popoverViewport = {
  addEventListener(type, listener) {
    viewportListeners.push({ type, listener });
  }
};
const historyPopover = ensureConversationHistoryPopover({
  root: popoverRoot,
  viewport: popoverViewport
});
assert(historyPopover?.id === "conversationHistoryPopover", "Conversation history popover creation should preserve id");
assert(historyPopover.className === "conversation-history-popover", "Conversation history popover creation should preserve class");
assert(historyPopover.hidden === true, "Conversation history popover creation should start hidden");
assert(
  ensureConversationHistoryPopover({ root: popoverRoot, viewport: popoverViewport }) === historyPopover,
  "Conversation history popover creation should reuse existing popovers"
);
assert(
  popoverListeners.some((entry) => entry.type === "pointerdown")
    && popoverListeners.some((entry) => entry.type === "canvas:view-transformed")
    && viewportListeners.some((entry) => entry.type === "resize"),
  "Conversation history popover creation should bind the same close events"
);

historyPopover.hidden = false;
const pointerListener = popoverListeners.find((entry) => entry.type === "pointerdown").listener;
pointerListener({
  target: {
    closest(selector) {
      return selector === "#conversationHistoryPopover, #conversationHistory" ? {} : null;
    }
  }
});
assert(historyPopover.hidden === false, "Conversation history popover should stay open for internal clicks");
pointerListener({
  target: {
    closest() {
      return null;
    }
  }
});
assert(historyPopover.hidden === true, "Conversation history popover should close on outside pointerdown");
historyPopover.hidden = false;
viewportListeners.find((entry) => entry.type === "resize").listener();
assert(historyPopover.hidden === true, "Conversation history popover should close on resize");
historyPopover.hidden = false;
popoverListeners.find((entry) => entry.type === "canvas:view-transformed").listener();
assert(historyPopover.hidden === true, "Conversation history popover should close on canvas transforms");
assert(closeConversationHistoryPopover(popoverRoot) === true, "Conversation history close should report closed popovers");
assert(closeConversationHistoryPopover(missingRoot) === false, "Conversation history close should tolerate missing popovers");

const centeredPosition = getConversationHistoryPopoverPosition({
  rect: { right: 500, bottom: 120 },
  viewportWidth: 1024,
  viewportHeight: 768
});
assert(
  centeredPosition.left === 180 && centeredPosition.top === 130,
  "Conversation history popover position should preserve desktop placement math"
);

const narrowPosition = getConversationHistoryPopoverPosition({
  rect: { right: 900, bottom: 700 },
  viewportWidth: 240,
  viewportHeight: 220
});
assert(
  narrowPosition.left === 16 && narrowPosition.top === 84,
  "Conversation history popover position should preserve narrow viewport clamping"
);

assert(
  getConversationHistoryPopoverPosition({ rect: null }) === null,
  "Conversation history popover position should ignore missing rects"
);

const button = {
  getBoundingClientRect() {
    return { right: 500, bottom: 120 };
  }
};
const popover = { style: {} };
assert(
  positionConversationHistoryPopover(button, popover, { innerWidth: 1024, innerHeight: 768 }) === true,
  "Conversation history popover positioning should report applied styles"
);
assert(
  popover.style.left === "180px" && popover.style.top === "130px",
  "Conversation history popover positioning should write pixel styles"
);
assert(
  positionConversationHistoryPopover(null, popover, { innerWidth: 1024, innerHeight: 768 }) === false,
  "Conversation history popover positioning should tolerate missing buttons"
);

console.log("Prompt conversation DOM utility checks passed.");
