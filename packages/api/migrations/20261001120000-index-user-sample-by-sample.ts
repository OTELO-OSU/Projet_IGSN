import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createIndex("user_sample_sample_id_idx")
    .on("user_sample")
    .column("sample_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("user_sample_sample_id_idx").execute();
}
