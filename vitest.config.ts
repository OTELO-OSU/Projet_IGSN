import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      {
        test: {
          name: "claude",
          include: ["./.claude/hooks/*.test.mjs"],
          maxWorkers: 2,
          maxConcurrency: 2,
          testTimeout: 5000,
        },
      },
    ],
  },
});
