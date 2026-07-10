import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  outputDir: "../../data/playwright-rewrite/web",
  use: {
    baseURL: "http://localhost:4174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4174",
    reuseExistingServer: true,
    timeout: 120_000
  }
});
