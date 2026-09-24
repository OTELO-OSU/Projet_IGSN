import { FileMigrationProvider, Migrator } from "kysely/migration";
import { promises as fs } from "node:fs";
import path from "node:path";

import { createDb } from "../src/db.ts";

async function migrateToLatest(): Promise<void> {
  const db = createDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(import.meta.dirname, "..", "migrations"),
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
