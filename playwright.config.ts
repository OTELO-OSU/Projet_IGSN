import { defineConfig, devices } from "@playwright/test";

// E2E needs the full dev stack (Keycloak + mock IdPs + apps), so there is no
// `webServer` here — start it with `make dev`, then `make test-e2e`.
//
// Projects group specs by app (admin / frontend); cross-app journeys get their
// own folder + project. There is no `baseURL`: page objects navigate to their
// app's absolute URL (see e2e/support/urls.ts), so a single journey can drive
// both origins. Run sequentially (workers: 1) so tests can reset+seed the shared
// database between each other; it also removes the Keycloak first-broker-login
// race that previously forced each parallel test onto a distinct researcher.
export default defineConfig({
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  // The e2e stack cold-boots (prod builds + Keycloak first-broker-login), so
  // the first post-login assertions can exceed Playwright's 5s default.
  expect: { timeout: 15_000 },
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "admin",
      testDir: "./e2e/admin",
      use: { ...devices["Desktop Chrome"], ...devices["Desktop Firefox"] },
    },
    {
      name: "frontend",
      testDir: "./e2e/frontend",
      use: {
        ...devices["Desktop Chrome"],
        ...devices["Desktop Firefox"],
        ...devices["Pixel 9"],
        ...devices["iPhone 12"],
      },
    },
  ],
});
