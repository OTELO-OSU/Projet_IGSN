import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample_relation")
    .dropColumn("relation_type_information")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample_relation")
    .addColumn("relation_type_information", sql`text`)
    .execute();
}
