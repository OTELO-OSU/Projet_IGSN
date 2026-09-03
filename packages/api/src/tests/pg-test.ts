import { createPostgresTestFunction } from "@kysely-vitest/postgres/test.js";

import type { DB } from "../db.ts";

export const pgTest = createPostgresTestFunction<DB>();
