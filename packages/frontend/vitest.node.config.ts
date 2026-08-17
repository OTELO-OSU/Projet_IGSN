import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@projet-igsn/frontend-node",
    globals: true,
    environment: "node",
    include: ["src/**/*.node.spec.ts"],
    maxWorkers: 2,
    maxConcurrency: 2,
  },
});
