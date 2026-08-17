import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("sc_provenance_status", sql`text`)
    .addColumn("sc_funder_organization", sql`text`)
    .addColumn("sc_research_program_name", sql`text`)
    .addColumn("sc_research_program_chief", sql`text`)
    .addColumn("sc_research_program_chief_orcid", sql`text`)
    .addColumn("sc_research_structure", sql`text`)
    .addColumn("sc_collector_name", sql`text`)
    .addColumn("sc_collector_orcid", sql`text`)
    .addColumn("sc_research_campaign", sql`text`)
    .addColumn("sc_funding", sql`text`)
    .addColumn("sc_research_program_description", sql`text`)
    .addColumn("sc_field_name", sql`text`)
    .addColumn("sc_mission_description", sql`text`)
    .addColumn("sc_collection_curator", sql`text`)
    .addColumn("sc_collection_origin", sql`text`)
    .addColumn("sc_collection_context_description", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("sc_provenance_status")
    .dropColumn("sc_funder_organization")
    .dropColumn("sc_research_program_name")
    .dropColumn("sc_research_program_chief")
    .dropColumn("sc_research_program_chief_orcid")
    .dropColumn("sc_research_structure")
    .dropColumn("sc_collector_name")
    .dropColumn("sc_collector_orcid")
    .dropColumn("sc_research_campaign")
    .dropColumn("sc_funding")
    .dropColumn("sc_research_program_description")
    .dropColumn("sc_field_name")
    .dropColumn("sc_mission_description")
    .dropColumn("sc_collection_curator")
    .dropColumn("sc_collection_origin")
    .dropColumn("sc_collection_context_description")
    .execute();
}
