import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`delete from service_account`.execute(db);

  await db.schema
    .alterTable("service_account")
    .addColumn("owner_id", "uuid", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("api_key_hash", "text")
    .execute();

  await db.schema
    .createIndex("service_account_api_key_hash_unique")
    .on("service_account")
    .unique()
    .column("api_key_hash")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("service_account")
    .dropColumn("api_key_hash")
    .dropColumn("owner_id")
    .execute();
}
