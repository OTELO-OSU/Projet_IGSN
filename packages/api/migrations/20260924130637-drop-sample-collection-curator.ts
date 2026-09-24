import { type Kysely, sql } from "kysely";

const CURATOR = "sc_collection_curator";

const NAME_COLUMNS = [`${CURATOR}_firstname`, `${CURATOR}_lastname`] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn(`${CURATOR}_user_id`)
    .dropColumn(`${CURATOR}_firstname`)
    .dropColumn(`${CURATOR}_lastname`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn(`${CURATOR}_firstname`, sql`text`)
    .addColumn(`${CURATOR}_lastname`, sql`text`)
    .addColumn(`${CURATOR}_user_id`, "uuid", (col) =>
      col.references("user.id").onDelete("restrict"),
    )
    .execute();
  const nulls = NAME_COLUMNS.map((column) => sql`${sql.ref(column)} is null`);
  await db.schema
    .alterTable("sample")
    .addCheckConstraint(
      `${CURATOR}_link_or_typed_name`,
      sql`${sql.ref(`${CURATOR}_user_id`)} is null or (${sql.join(nulls, sql` and `)})`,
    )
    .execute();
  await db.schema
    .createIndex(`sample_${CURATOR}_user_id_idx`)
    .on("sample")
    .column(`${CURATOR}_user_id`)
    .execute();
  for (const column of NAME_COLUMNS) {
    await sql`
      CREATE INDEX ${sql.raw(`sample_${column}_trgm_idx`)} ON sample
        USING gin (public.immutable_unaccent(coalesce(${sql.ref(column)}, '')) gin_trgm_ops)
    `.execute(db);
  }
}
