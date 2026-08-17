import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { defineConfig } from "vitest/config";

import { paraglideOptions } from "./paraglide.config.ts";

export default defineConfig({
  plugins: [
    react(),
    paraglideVitePlugin({
      ...paraglideOptions,
      project: path.resolve(__dirname, "project.inlang"),
      outdir: path.resolve(__dirname, "src/paraglide"),
    }),
  ],
  resolve: { tsconfigPaths: true },
  publicDir: path.resolve(__dirname, "test/public"),
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [{ browser: "chromium" }],
    },
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
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
