import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

import { paraglideOptions } from "./src/i18n/paraglide";

export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      ...paraglideOptions,
      project: path.resolve(__dirname, "project.inlang"),
      outdir: path.resolve(__dirname, "src/paraglide"),
    }),
    react(),
  ],
  resolve: { dedupe: ["react"] },
  optimizeDeps: { include: ["@inlang/paraglide-js/urlpattern-polyfill"] },
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [{ browser: "chromium" }],
    },
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "src/**/*.node.spec.ts"],
    maxWorkers: 2,
    maxConcurrency: 2,
    testTimeout: 5000,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
