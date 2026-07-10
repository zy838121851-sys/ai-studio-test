import { describe, expect, it } from "vitest";
import { CapabilityRegistry } from "@ai-studio/server-core";

import { CapabilitiesController } from "./capabilities.controller.js";
import type { PlatformService } from "./platform.service.js";

describe("CapabilitiesController", () => {
  it("returns stable fail-closed capability metadata", () => {
    const platform = {
      capabilities: new CapabilityRegistry("production", {
        "object-storage": "configured",
        "image-generation": "verified"
      })
    } as PlatformService;

    const response = new CapabilitiesController(platform).getCapabilities();

    expect(response.environment).toBe("production");
    expect(response.capabilities).toContainEqual({
      id: "object-storage",
      category: "storage",
      status: "configured",
      actionAllowed: false,
      reason: "live-verification-required"
    });
    expect(response.capabilities).toContainEqual({
      id: "image-generation",
      category: "ai",
      status: "verified",
      actionAllowed: true,
      reason: "available"
    });
    expect(JSON.stringify(response)).not.toContain("credential");
  });
});
