import { defineConfig, devices } from "@playwright/test";
import { availableParallelism } from "node:os";

const admin = { testDir: "./e2e/admin", use: devices["Desktop Firefox"] };
const frontend = { testDir: "./e2e/frontend", use: devices["iPhone 12"] };
const readonly = /@readonly/;
const mutating = {
  grepInvert: readonly,
  dependencies: ["admin-readonly", "frontend-readonly"],
};

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // ponytail: WORLD_COUNT of packages/api/scripts/seed-e2e-world.ts copied by hand, as in saml-idp/authsources.php; read it from the seed if it changes often.
  workers: Math.min(6, Math.max(1, Math.floor(availableParallelism() / 2))),
  reporter: "list",
  globalSetup: "./e2e/support/global-setup.ts",
  expect: { timeout: 15_000 },
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "warm-up",
      testDir: "./e2e/support",
      testMatch: "warm-up.setup.ts",
      use: admin.use,
    },
    {
      name: "admin-readonly",
      ...admin,
      grep: readonly,
      dependencies: ["warm-up"],
    },
    {
      name: "frontend-readonly",
      ...frontend,
      grep: readonly,
      dependencies: ["warm-up"],
    },
    { name: "admin", ...admin, ...mutating },
    { name: "frontend", ...frontend, ...mutating },
  ],
});
