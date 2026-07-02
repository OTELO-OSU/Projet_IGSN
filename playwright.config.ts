import { defineConfig } from "@playwright/test";

// E2E needs the full dev stack (Keycloak + mock IdPs + apps), so there is no
// `webServer` here — start it with `make dev`, then `make test-e2e`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: process.env.ADMIN_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
  },
});
