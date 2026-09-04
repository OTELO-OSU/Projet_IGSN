import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("service_account")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("institutional_organization", "text", (col) => col.notNull())
    .addColumn("institutional_osu", "text")
    .addColumn("institutional_laboratory", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("service_account_name_unique")
    .on("service_account")
    .unique()
    .expression(sql`lower(name)`)
    .execute();

  await db.schema
    .createTable("service_account_managed_institutional_group")
    .addColumn("service_account_id", "uuid", (col) =>
      col.notNull().references("service_account.id").onDelete("cascade"),
    )
    .addColumn("kind", "text", (col) =>
      col.notNull().check(sql`kind in ('organization', 'osu', 'laboratory')`),
    )
    .addColumn("code", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint(
      "service_account_managed_institutional_group_pkey",
      ["service_account_id", "kind", "code"],
    )
    .execute();

  await db.schema
    .createTable("service_account_managed_manual_group")
    .addColumn("service_account_id", "uuid", (col) =>
      col.notNull().references("service_account.id").onDelete("cascade"),
    )
    .addColumn("group_id", "uuid", (col) =>
      col.notNull().references("manual_group.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("service_account_managed_manual_group_pkey", [
      "service_account_id",
      "group_id",
    ])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("service_account_managed_manual_group").execute();
  await db.schema
    .dropTable("service_account_managed_institutional_group")
    .execute();
  await db.schema.dropTable("service_account").execute();
}
