import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    // Nullable: optional on a draft, required only to publish (enforced in
    // domain by samplePublishBlockers, not by a DB constraint).
    .addColumn("specific_name", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("specific_name").execute();
}
