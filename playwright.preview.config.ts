import { defineConfig, devices } from "@playwright/test";

// Optional development run of the public dock; CI checks its production build.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /timeline-dock\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "../bong_codex_handoff/.build-evidence/preview-playwright",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3210",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3210",
    reuseExistingServer: !process.env.CI,
  },
});
