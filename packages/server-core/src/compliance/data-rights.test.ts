import { describe, expect, it } from "vitest";

import { transitionDataRightsRequest } from "./data-rights.js";

describe("data rights workflow", () => {
  it("only allows authenticated-request lifecycle transitions", () => {
    expect(transitionDataRightsRequest("pending", "processing")).toBe("processing");
    expect(transitionDataRightsRequest("processing", "completed")).toBe("completed");
    expect(() => transitionDataRightsRequest("completed", "processing")).toThrow("数据权利请求状态转换无效");
  });
});
