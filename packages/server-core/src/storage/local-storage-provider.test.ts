import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { LocalStorageProvider } from "./local-storage-provider.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

describe("LocalStorageProvider", () => {
  it("stores bytes under a normalized key", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-studio-storage-"));
    temporaryDirectories.push(directory);
    const provider = new LocalStorageProvider(directory);

    await provider.put({
      key: "workspace-1/input/reference.png",
      body: Buffer.from("image"),
      contentType: "image/png"
    });

    await expect(provider.exists("workspace-1/input/reference.png")).resolves.toBe(true);
    await expect(provider.get("workspace-1/input/reference.png")).resolves.toEqual(
      Buffer.from("image")
    );
  });

  it("rejects traversal keys", () => {
    const provider = new LocalStorageProvider(tmpdir());

    expect(() => provider.normalizeKey("../secret.txt")).toThrow("Storage key is invalid.");
  });
});
