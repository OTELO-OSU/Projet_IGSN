import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("user_managed_manual_group")
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("group_id", "uuid", (col) =>
      col.notNull().references("manual_group.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("user_managed_manual_group_pkey", [
      "user_id",
      "group_id",
    ])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("user_managed_manual_group").execute();
}
