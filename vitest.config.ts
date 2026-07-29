import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "packages/frontend/vitest.node.config.ts"],
  },
});
