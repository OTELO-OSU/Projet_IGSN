import { Kysely, type Generated } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import { z } from "zod";

type SampleTable = {
  // UUIDv7 generated in the app, so it is a required value on insert.
  id: string;
  name: string;
  nature: string;
  // Taxonomy path (e.g. "core.section"); null until classified.
  type: string | null;
  // Null until the sample is published; then derived from the id with generateIgsnSuffix.
  igsn: string | null;
  published: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type DB = {
  sample: SampleTable;
};

const dbConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z
    .literal("require")
    .optional()
    .transform((v) => v ?? undefined),
});

export function createDb(): Kysely<DB> {
  const config = dbConfigSchema.parse({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || undefined,
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL,
  });
  return new Kysely<DB>({
    dialect: new PostgresJSDialect({ postgres: postgres(config) }),
  });
}
