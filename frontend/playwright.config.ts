import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Next.js loads .env.local into its own dev-server process automatically;
// the separate `playwright test` process does not inherit that, so the
// Recommendation Review test (which calls the backend directly with
// NEXT_PUBLIC_DEV_TOKEN) would otherwise silently fall back to an invalid
// placeholder token and get 401s. Parse it in manually — no extra dependency.
const envLocalPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf-8").split("\n")) {
    const match = line.match(/^([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
