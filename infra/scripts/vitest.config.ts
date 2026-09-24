import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "scripts",
    maxWorkers: 2,
  },
});
