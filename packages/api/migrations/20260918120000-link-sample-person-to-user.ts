import { type Kysely, sql } from "kysely";

const PERSONS = [
  ["sc_chief_scientist", true],
  ["sc_collector", true],
  ["sc_collection_curator", false],
  ["syn_operator", true],
] as const;

const USER_NAME_COLUMNS = ["firstname", "name"] as const;

const constraintName = (person: string) => `${person}_link_or_typed_name`;

const typedColumns = (person: string, hasOrcid: boolean) => [
  `${person}_firstname`,
  `${person}_lastname`,
  ...(hasOrcid ? [`${person}_orcid`] : []),
];

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const [person] of PERSONS) {
    await db.schema
      .alterTable("sample")
      .addColumn(`${person}_user_id`, "uuid", (col) =>
        col.references("user.id").onDelete("restrict"),
      )
      .execute();
  }
  for (const [person, hasOrcid] of PERSONS) {
    const nulls = typedColumns(person, hasOrcid).map(
      (column) => sql`${sql.ref(column)} is null`,
    );
    await db.schema
      .alterTable("sample")
      .addCheckConstraint(
        constraintName(person),
        sql`${sql.ref(`${person}_user_id`)} is null or (${sql.join(nulls, sql` and `)})`,
      )
      .execute();
  }
  for (const [person] of PERSONS) {
    await db.schema
      .createIndex(`sample_${person}_user_id_idx`)
      .on("sample")
      .column(`${person}_user_id`)
      .execute();
  }
  for (const column of USER_NAME_COLUMNS) {
    await sql`
      CREATE INDEX ${sql.raw(`user_${column}_trgm_idx`)} ON "user"
        USING gin (public.immutable_unaccent(coalesce(${sql.ref(column)}, '')) gin_trgm_ops)
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of USER_NAME_COLUMNS) {
    await sql`DROP INDEX ${sql.raw(`user_${column}_trgm_idx`)}`.execute(db);
  }
  for (const [person] of PERSONS) {
    await db.schema.dropIndex(`sample_${person}_user_id_idx`).execute();
    await db.schema
      .alterTable("sample")
      .dropConstraint(constraintName(person))
      .execute();
    await db.schema
      .alterTable("sample")
      .dropColumn(`${person}_user_id`)
      .execute();
  }
}
