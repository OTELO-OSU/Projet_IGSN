import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS ltree`.execute(db);
  await db.schema
    .alterTable("sample")
    // Hierarchical classification path (e.g. rock.igneous).
    // Nullable: a draft can be saved before it is classified.
    .addColumn("material", sql`ltree`)
    .execute();
  // GiST index serves every ancestor/descendant and lquery key search off one
  // index (the reason we chose ltree over a flat path column). See ADR 0008.
  await sql`CREATE INDEX sample_material_idx ON sample USING GIST (material)`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("material").execute();
  // Leave the ltree extension installed; other objects may use it.
}
