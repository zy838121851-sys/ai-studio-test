import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tempDir = mkdtempSync(join(tmpdir(), "ai-studio-conversations-"));
process.env.DATABASE_URL = `sqlite:${join(tempDir, "test.sqlite")}`;

const { closeDatabase, execute, initializeDatabase } = await import("../src/server/db/sqlite.js");
const { createProject } = await import("../src/server/services/project.service.js");
const {
  archiveProjectConversation,
  appendConversationMessage,
  getOrCreateProjectConversation,
  listConversationMessages,
  listProjectConversations,
  restoreProjectConversation
} = await import("../src/server/services/conversation.service.js");

try {
  initializeDatabase();
  initializeDatabase();
  const now = Date.now();
  execute(`
    INSERT INTO users (
      id, email, name, password_hash, password_salt, created_at, updated_at
    )
    VALUES
      ('user-a', 'a@example.com', 'A', 'hash', 'salt', ${now}, ${now}),
      ('user-b', 'b@example.com', 'B', 'hash', 'salt', ${now}, ${now});
  `);
  const project = createProject("user-a", {
    id: "project-a",
    title: "Conversation test"
  });
  const first = getOrCreateProjectConversation("user-a", project.id);
  const second = getOrCreateProjectConversation("user-a", project.id);
  assert(first.id === second.id, "get-or-create should reuse the active project conversation");
  appendConversationMessage({
    conversationId: first.id,
    userId: "user-a",
    projectId: project.id,
    role: "user",
    content: { text: "hello" }
  });
  const messages = listConversationMessages("user-a", first.id);
  assert(messages?.length === 1, "message should be persisted");
  assert(messages[0].content.text === "hello", "message content should round trip");

  archiveProjectConversation("user-a", project.id);
  const replacement = getOrCreateProjectConversation("user-a", project.id);
  assert(replacement.id !== first.id, "new conversation should be created after archiving the active one");
  const conversations = listProjectConversations("user-a", project.id);
  assert(conversations.length === 2, "history list should include active and archived conversations");
  assert(conversations.some((conversation) => conversation.id === first.id && conversation.archived), "history should mark archived conversations");
  assert(conversations.some((conversation) => conversation.id === replacement.id && !conversation.archived), "history should include the active conversation");

  const restored = restoreProjectConversation("user-a", first.id);
  assert(restored.id === first.id && !restored.archived, "restore should reactivate the selected conversation");
  const afterRestore = listProjectConversations("user-a", project.id);
  assert(afterRestore.filter((conversation) => !conversation.archived).length === 1, "restore should leave exactly one active conversation");
  assert(afterRestore.find((conversation) => conversation.id === replacement.id)?.archived, "restore should archive the previous active conversation");

  let crossUserBlocked = false;
  try {
    getOrCreateProjectConversation("user-b", project.id);
  } catch (error) {
    crossUserBlocked = error.status === 404;
  }
  assert(crossUserBlocked, "cross-user project access should be blocked");
  let crossUserRestoreBlocked = false;
  try {
    restoreProjectConversation("user-b", first.id);
  } catch (error) {
    crossUserRestoreBlocked = error.status === 404;
  }
  assert(crossUserRestoreBlocked, "cross-user conversation restore should be blocked");
  console.log("Conversation persistence checks passed");
} finally {
  closeDatabase();
  rmSync(tempDir, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
