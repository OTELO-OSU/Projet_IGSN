import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { defineConfig } from "vitest/config";

import { paraglideOptions } from "./src/i18n/paraglide";

export default defineConfig({
  // paraglide generates src/paraglide/* (gitignored) at config time; without it
  // a clean checkout (CI) has no messages module and every importer fails to
  // load. Resolve project/outdir absolutely: vitest runs from the monorepo root,
  // so paraglideOptions' relative paths would resolve against the wrong cwd.
  plugins: [
    paraglideVitePlugin({
      ...paraglideOptions,
      project: path.resolve(__dirname, "project.inlang"),
      outdir: path.resolve(__dirname, "src/paraglide"),
    }),
    react(),
  ],
  // lucide-react (and other deps) must resolve the same React instance as the
  // renderer, or their useContext hooks see a null React.
  resolve: { dedupe: ["react"] },
  // The `url` strategy pulls in urlpattern-polyfill; pre-bundle it so vitest
  // doesn't re-optimize and reload mid-run (a documented flaky-test trigger).
  optimizeDeps: { include: ["@inlang/paraglide-js/urlpattern-polyfill"] },
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
    maxWorkers: 2,
    maxConcurrency: 2,
    testTimeout: 5000,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
