import { kyselyPostgres } from "@kysely-vitest/postgres/plugin.js";
import { randomInt } from "node:crypto";
import path from "node:path";
import { defineConfig } from "vitest/config";

import type { DB } from "./src/db.ts";

export default defineConfig({
  plugins: [
    kyselyPostgres<DB>({
      config: {
        dockerContainer: { image: "postgis/postgis", tag: "17-3.5" },
        port: randomInt(20000, 40000),
      },
      migrationFolder: path.resolve(__dirname, "migrations"),
    }),
  ],
  test: {
    globals: true,
    include: ["{src,scripts}/**/*.spec.ts"],
    maxWorkers: 2,
    maxConcurrency: 2,
    testTimeout: 2500,
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
