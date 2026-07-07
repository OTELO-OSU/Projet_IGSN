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
      // Chromium only: headless Firefox drops trusted input events and stalls
      // pages under parallel load, making interaction tests flaky.
      instances: [{ browser: "chromium" }],
    },
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
