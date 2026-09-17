import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  expect: { timeout: 15_000 },
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "admin",
      testDir: "./e2e/admin",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "frontend",
      testDir: "./e2e/frontend",
      use: { ...devices["iPhone 12"] },
    },
  ],
});
