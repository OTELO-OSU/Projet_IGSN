import { type Kysely } from "kysely";

// The claim moves off `sample` into its own row, so no query reading a sample
// can carry who is editing it. One row per sample: the primary key is what
// makes the claim exclusive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_edit_lock")
    .addColumn("sample_id", "uuid", (col) =>
      col.primaryKey().references("sample.id").onDelete("cascade"),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable("sample")
    .dropColumn("editing_user_id")
    .dropColumn("editing_expires_at")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("editing_user_id", "uuid", (col) =>
      col.references("user.id").onDelete("set null"),
    )
    .addColumn("editing_expires_at", "timestamptz")
    .execute();
  await db.schema.dropTable("sample_edit_lock").execute();
}
