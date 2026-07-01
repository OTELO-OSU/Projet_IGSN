import { Kysely } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";

// Self-contained connection: migrations run as a one-off task with their own
// client, independent of the app request-path pool.
function createDb(): Kysely<unknown> {
  return new Kysely<unknown>({
    dialect: new PostgresJSDialect({
      postgres: postgres({
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT
          ? Number(process.env.DATABASE_PORT)
          : 5432,
        database: process.env.DATABASE_NAME,
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        // RDS can enforce TLS; opt in with DATABASE_SSL=require.
        ssl: process.env.DATABASE_SSL === "require" ? "require" : undefined,
      }),
    }),
  });
}

async function migrateToLatest(): Promise<void> {
  const db = createDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(import.meta.dirname, "migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      console.info(`applied migration "${result.migrationName}"`);
    } else if (result.status === "Error") {
      console.error(`failed migration "${result.migrationName}"`);
    }
  }

  await db.destroy();

  if (error) {
    console.error("migration failed", error);
    process.exit(1);
  }
}

await migrateToLatest();
