import { defineConfig } from "@playwright/test";

const frontendUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const devCommand =
  process.platform === "win32"
    ? "npm.cmd run dev -- --host localhost --port 5173"
    : "npm run dev -- --host localhost --port 5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: "list",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: devCommand,
    url: frontendUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
