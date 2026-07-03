import {
  clearConversationChatLog,
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
