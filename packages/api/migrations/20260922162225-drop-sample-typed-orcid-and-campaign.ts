import { type Kysely, sql } from "kysely";

const DROPPED_SAMPLE_COLUMNS = [
  "sc_chief_scientist_orcid",
  "sc_collector_orcid",
  "syn_operator_orcid",
  "sc_research_campaign",
  "sc_field_name",
  "sc_mission_description",
] as const;

const ADDED_SAMPLE_COLUMNS = [
  "sc_platform_type",
  "sc_launch_platform_name",
] as const;

const LINKED_PERSONS = [
  ["sample", "sc_chief_scientist", "sc_chief_scientist_link_or_typed_name"],
  ["sample", "sc_collector", "sc_collector_link_or_typed_name"],
  ["sample", "syn_operator", "syn_operator_link_or_typed_name"],
  ["sample_additional_role", "person", "additional_role_link_or_typed_name"],
] as const;

function linkOrTypedName(person: string, withOrcid: boolean) {
  const typed = [
    `${person}_firstname`,
    `${person}_lastname`,
    ...(withOrcid ? [`${person}_orcid`] : []),
  ].map((column) => sql`${sql.ref(column)} is null`);
  return sql`${sql.ref(`${person}_user_id`)} is null or (${sql.join(typed, sql` and `)})`;
}

async function addLinkOrTypedNameConstraints(
  db: Kysely<unknown>,
  withOrcid: boolean,
): Promise<void> {
  for (const [table, person, constraint] of LINKED_PERSONS) {
    await db.schema
      .alterTable(table)
      .addCheckConstraint(constraint, linkOrTypedName(person, withOrcid))
      .execute();
  }
}

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const column of DROPPED_SAMPLE_COLUMNS) {
    await db.schema.alterTable("sample").dropColumn(column).execute();
  }
  await db.schema
    .alterTable("sample_additional_role")
    .dropColumn("person_orcid")
    .execute();
  for (const column of ADDED_SAMPLE_COLUMNS) {
    await db.schema.alterTable("sample").addColumn(column, "text").execute();
  }
  await addLinkOrTypedNameConstraints(db, false);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const [table, , constraint] of LINKED_PERSONS) {
    await db.schema.alterTable(table).dropConstraint(constraint).execute();
  }
  for (const column of ADDED_SAMPLE_COLUMNS) {
    await db.schema.alterTable("sample").dropColumn(column).execute();
  }
  for (const column of DROPPED_SAMPLE_COLUMNS) {
    await db.schema.alterTable("sample").addColumn(column, "text").execute();
  }
  await db.schema
    .alterTable("sample_additional_role")
    .addColumn("person_orcid", "text")
    .execute();
  await addLinkOrTypedNameConstraints(db, true);
}
