import { defineConfig, devices } from "@playwright/test";
// Explicit opt-in is confined to the preserved community regression suite.
const community = process.env.BONG_E2E_SCOPE === "community";
if (
  process.env.BONG_E2E_SCOPE &&
  !["v1", "community"].includes(process.env.BONG_E2E_SCOPE)
)
  throw new Error("BONG_E2E_SCOPE must be v1 or community.");
process.env.COMMUNITY_ENABLED = community ? "true" : "false";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 30000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: ".runtime/playwright",
  use: {
    baseURL: "http://127.0.0.1:3210",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3210",
    reuseExistingServer: false,
    env: {
      COMMUNITY_ENABLED: community ? "true" : "false",
      REGISTRATIONS_ENABLED: "false",
      POSTING_ENABLED: "false",
      UPLOADS_ENABLED: "false",
    },
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      grepInvert: community ? /@public-v1/ : /@community/,
      testIgnore: /a11y/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "accessibility",
      testMatch: /a11y/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
