import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";
import { writeFileSync } from "node:fs";

import type { DB } from "../src/db.ts";

import { createApp } from "../src/app.ts";

const db = new Kysely<DB>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (kysely) => new PostgresIntrospector(kysely),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
});

const response = await createApp(db).app.request("/service/openapi.json");

writeFileSync(
  new URL("../openapi.json", import.meta.url),
  `${JSON.stringify(await response.json(), null, 2)}\n`,
);
