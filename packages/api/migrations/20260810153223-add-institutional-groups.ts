import { type Kysely } from "kysely";

const COLUMNS = [
  "institutional_organization",
  "institutional_osu",
  "institutional_laboratory",
] as const;

// ponytail: the sample columns duplicate what the mock reference data derives from the labo; stored anyway because real co-tutelle data will not be a clean tree
const TABLES = ["user", "sample"] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const table of TABLES) {
    for (const column of COLUMNS) {
      await db.schema.alterTable(table).addColumn(column, "text").execute();
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of TABLES) {
    for (const column of COLUMNS) {
      await db.schema.alterTable(table).dropColumn(column).execute();
    }
  }
}
