import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("syn_experiment_duration_not_relevant")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("syn_experiment_duration_not_relevant", sql`boolean`)
    .execute();
}
