import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("internal_number", "integer", (col) => col.unique())
    .execute();
  await sql`CREATE SEQUENCE sample_internal_number_seq OWNED BY sample.internal_number`.execute(
    db,
  );
  await sql`
    UPDATE sample SET internal_number = numbered.n
    FROM (
      SELECT id, row_number() OVER (ORDER BY published_at, id) AS n
      FROM sample WHERE status <> 'draft'
    ) AS numbered
    WHERE sample.id = numbered.id
  `.execute(db);
  await sql`
    SELECT setval('sample_internal_number_seq', max(internal_number)) FROM sample
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("internal_number").execute();
}
