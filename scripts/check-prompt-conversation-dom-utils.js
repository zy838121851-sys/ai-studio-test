import {
  clearConversationChatLog
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

console.log("Prompt conversation DOM utility checks passed.");
