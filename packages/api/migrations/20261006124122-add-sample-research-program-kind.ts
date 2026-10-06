import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("sc_research_program_kind", sql`text`)
    .execute();
  await sql`update sample set sc_research_program_kind = 'program' where sc_research_program_name is not null`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("sc_research_program_kind")
    .execute();
}
