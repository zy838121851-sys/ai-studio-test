import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomeRoute from "./home.js";

describe("HomeRoute", () => {
  it("identifies the isolated rewrite entry", () => {
    render(<HomeRoute />);

    expect(screen.getByRole("heading", { name: "React 首页迁移工作区" })).toBeVisible();
  });
});
