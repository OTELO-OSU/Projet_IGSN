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
    // vitest default (5000). Browser-mode interaction tests (two sequential
    // firefox actionability-checked clicks in combobox-field) overrun a tighter
    // budget under full-suite parallel load; keep the headroom or they flake.
    testTimeout: 5000,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
