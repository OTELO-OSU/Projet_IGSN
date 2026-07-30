import { defineConfig } from "vitest/config";

// AsyncLocalStorage cannot run in a browser, so the SSR-only specs need a node
// project next to the browser one.
export default defineConfig({
  test: {
    name: "@projet-igsn/frontend-node",
    globals: true,
    environment: "node",
    include: ["src/**/*.node.spec.ts"],
    // Vitest requires projects sharing a group order to agree on these.
    maxWorkers: 2,
    maxConcurrency: 2,
  },
});
