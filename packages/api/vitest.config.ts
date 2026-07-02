import { kyselyPostgres } from "@kysely-vitest/postgres/plugin.js";
import path from "node:path";
import { defineConfig } from "vitest/config";

import type { DB } from "./src/db.ts";

export default defineConfig({
  plugins: [
    kyselyPostgres<DB>({
      config: {
        dockerContainer: { image: "postgres", tag: "17-alpine" },
        database: "testdb",
        username: "test",
        password: "test",
      },
      migrationFolder: path.resolve(__dirname, "migrations"),
    }),
  ],
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
    testTimeout: 2500,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
