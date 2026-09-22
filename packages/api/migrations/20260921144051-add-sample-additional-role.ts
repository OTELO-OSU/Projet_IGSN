import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_additional_role")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("person_user_id", "uuid", (col) =>
      col.references("user.id").onDelete("restrict"),
    )
    .addColumn("person_firstname", "text")
    .addColumn("person_lastname", "text")
    .addColumn("person_orcid", "text")
    .addCheckConstraint(
      "additional_role_link_or_typed_name",
      sql`person_user_id is null or (person_firstname is null and person_lastname is null and person_orcid is null)`,
    )
    .execute();
  await db.schema
    .createIndex("sample_additional_role_sample_id")
    .on("sample_additional_role")
    .column("sample_id")
    .execute();
  await db.schema
    .createIndex("sample_additional_role_person_user_id")
    .on("sample_additional_role")
    .column("person_user_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_additional_role").execute();
}
