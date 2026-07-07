import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // The ltree extension is already created by the add-sample-type migration.
  await db.schema
    .alterTable("sample")
    // Nullable: a sample can be declared before its collection method is known.
    // The value is a taxonomy path (e.g. "coring.gravity_corer") validated in
    // domain; ltree gives indexable ancestor queries (collection_method <@ 'coring').
    .addColumn("collection_method", sql`ltree`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("collection_method")
    .execute();
}
