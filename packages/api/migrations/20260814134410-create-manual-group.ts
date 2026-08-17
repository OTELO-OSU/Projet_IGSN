import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("manual_group")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // Two groups differing only by case are the same group to a researcher.
  await db.schema
    .createIndex("manual_group_name_unique")
    .on("manual_group")
    .unique()
    .expression(sql`lower(name)`)
    .execute();

  await db.schema
    .createTable("manual_group_member")
    .addColumn("group_id", "uuid", (col) =>
      col.notNull().references("manual_group.id").onDelete("cascade"),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("manual_group_member_pkey", [
      "group_id",
      "user_id",
    ])
    .execute();

  await db.schema
    .createIndex("manual_group_member_user_id")
    .on("manual_group_member")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("manual_group_member").execute();
  await db.schema.dropTable("manual_group").execute();
}
