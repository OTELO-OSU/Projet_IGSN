import type { Kysely } from "kysely";

// No index, the row is always reached by the sample's primary key.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("editing_user_id", "uuid", (col) =>
      // The claim outlives neither the user nor the need to edit: a deleted
      // user leaves the sample editable rather than locked forever.
      col.references("user.id").onDelete("set null"),
    )
    .addColumn("editing_expires_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("editing_user_id")
    .dropColumn("editing_expires_at")
    .execute();
}
