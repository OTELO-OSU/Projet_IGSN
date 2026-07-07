import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    paraglideVitePlugin({
      project: path.resolve(__dirname, "project.inlang"),
      outdir: path.resolve(__dirname, "src/paraglide"),
      outputStructure: "message-modules",
      strategy: ["baseLocale"],
    }),
  ],
  resolve: { tsconfigPaths: true },
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      // Chromium only: headless Firefox drops trusted input events and stalls
      // pages under parallel load, making interaction tests flaky.
      instances: [{ browser: "chromium" }],
    },
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    // Browser-mode interaction tests need headroom under full-suite parallel
    // load (vitest default 5000); radix portals can additionally miss a click
    // entirely there, and a retry on a fresh page recovers it.
    retry: 2,
    maxWorkers: 2,
    maxConcurrency: 4,
    testTimeout: 5000,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
