import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [{ browser: "chromium" }],
    },
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    testTimeout: 2500,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
