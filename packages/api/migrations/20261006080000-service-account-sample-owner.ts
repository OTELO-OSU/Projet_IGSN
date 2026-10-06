import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("service_account")
    .addColumn("sample_owner_id", "uuid", (col) =>
      col.references("user.id").onDelete("cascade"),
    )
    .execute();
  await sql`update service_account set sample_owner_id = owner_id`.execute(db);
  await db.schema
    .alterTable("service_account")
    .alterColumn("sample_owner_id", (col) => col.setNotNull())
    .dropColumn("institutional_organization")
    .dropColumn("institutional_osu")
    .dropColumn("institutional_laboratory")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("service_account")
    .addColumn("institutional_organization", "text")
    .addColumn("institutional_osu", "text")
    .addColumn("institutional_laboratory", "text")
    .execute();
  await sql`
    update service_account
    set
      institutional_organization = "user".institutional_organization,
      institutional_osu = "user".institutional_osu,
      institutional_laboratory = "user".institutional_laboratory
    from "user"
    where "user".id = service_account.sample_owner_id
  `.execute(db);
  await db.schema
    .alterTable("service_account")
    .dropColumn("sample_owner_id")
    .execute();
}
