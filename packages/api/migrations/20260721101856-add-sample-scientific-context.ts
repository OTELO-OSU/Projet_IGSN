import { type Kysely, sql } from "kysely";

// Sample scientific context: flat nullable columns on sample, no side table,
// the same storage pattern as the location (ADR 0014). `sc_provenance_status`
// is the discriminant (recent_collection / historical_specimen); each branch's
// fields are nullable columns, shared `sc_collector_name` serves both. All
// vocabulary codes and free text are text; ROR identifiers are text too.
const COLUMNS = [
  "sc_provenance_status",
  "sc_funder_organization",
  "sc_research_program_name",
  "sc_research_program_chief",
  "sc_research_program_chief_orcid",
  "sc_research_structure",
  "sc_collector_name",
  "sc_collector_orcid",
  "sc_research_campaign",
  "sc_funding",
  "sc_research_program_description",
  "sc_field_name",
  "sc_mission_description",
  "sc_collection_curator",
  "sc_collection_origin",
  "sc_collection_context_description",
] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  let table = db.schema.alterTable("sample").addColumn(COLUMNS[0], sql`text`);
  for (const column of COLUMNS.slice(1)) {
    table = table.addColumn(column, sql`text`);
  }
  await table.execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  let table = db.schema.alterTable("sample").dropColumn(COLUMNS[0]);
  for (const column of COLUMNS.slice(1)) {
    table = table.dropColumn(column);
  }
  await table.execute();
}
