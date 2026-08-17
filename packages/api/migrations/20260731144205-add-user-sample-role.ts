import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user_sample")
    .addColumn("role", "text", (col) =>
      col.check(sql`role in ('owner', 'contributor')`),
    )
    .execute();

  await sql`update user_sample set role = 'owner'`.execute(db);

  await db.schema
    .alterTable("user_sample")
    .alterColumn("role", (col) => col.setNotNull())
    .execute();

  await db.schema
    .createIndex("user_sample_one_owner")
    .on("user_sample")
    .column("sample_id")
    .unique()
    .where(sql.ref("role"), "=", "owner")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("user_sample_one_owner").execute();
  await db.schema.alterTable("user_sample").dropColumn("role").execute();
}
