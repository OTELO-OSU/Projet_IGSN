import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // lucide-react (and other deps) must resolve the same React instance as the
  // renderer, or their useContext hooks see a null React.
  resolve: { dedupe: ["react"] },
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [{ browser: "chromium" }, { browser: "firefox" }],
    },
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    // Browser-mode interaction tests need headroom under full-suite parallel
    // load (vitest default 5000); radix portals can additionally miss a click
    // entirely there, and a retry on a fresh page recovers it.
    retry: 2,
    testTimeout: 5000,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
