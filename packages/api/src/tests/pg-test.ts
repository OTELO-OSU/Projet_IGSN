import { createTestFunction } from "@kysely-vitest/core/test.js";
import { POSTGRES_CONFIG_KEY } from "@kysely-vitest/postgres/dialect.js";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";

import { type DB, POSTGRES_TYPES } from "../db.ts";

export const pgTest = createTestFunction<typeof POSTGRES_CONFIG_KEY, DB>({
  configKey: POSTGRES_CONFIG_KEY,
  dialectFactory: (config) =>
    new PostgresJSDialect({
      postgres: postgres({
        debug: false,
        onnotice() {},
        ...config,
        types: POSTGRES_TYPES,
      }),
    }),
});
