import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    // Nullable: a sample can be declared before it is classified. The value is
    // a taxonomy path (e.g. "core.section") validated in domain.
    .addColumn("type", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("type").execute();
}
