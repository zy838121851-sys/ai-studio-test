import { describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@ai-studio/server-core";

import { ConversationsController } from "./conversations.controller.js";
import type { PlatformService } from "../platform.service.js";

describe("ConversationsController", () => {
  it("uses the authenticated workspace context when restoring a project conversation", async () => {
    const getProjectConversation = vi.fn().mockResolvedValue({
      id: "conversation-1",
      projectId: "project-1",
      messages: [],
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z"
    });
    const platform = { conversations: { getProjectConversation } } as unknown as PlatformService;
    const auth: AuthContext = {
      userId: "user-1",
      workspaceId: "workspace-1",
      email: "user@example.com",
      displayName: "User",
      workspaceName: "Workspace",
      sessionId: "session-1"
    };

    await expect(new ConversationsController(platform).get(auth, "project-1")).resolves.toMatchObject({
      projectId: "project-1"
    });
    expect(getProjectConversation).toHaveBeenCalledWith(auth, "project-1");
  });
});
