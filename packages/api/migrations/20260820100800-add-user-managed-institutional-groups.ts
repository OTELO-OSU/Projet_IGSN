import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("user_managed_institutional_group")
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("kind", "text", (col) =>
      col.notNull().check(sql`kind in ('organization', 'osu', 'laboratory')`),
    )
    .addColumn("code", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("user_managed_institutional_group_pkey", [
      "user_id",
      "kind",
      "code",
    ])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("user_managed_institutional_group").execute();
}
