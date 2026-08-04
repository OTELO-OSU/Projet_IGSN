import { type Kysely, sql } from "kysely";

// Search matches igsn by equality only, served by the unique constraint's
// index, so the trigram index is write cost for no read.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX sample_igsn_trgm_idx`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE INDEX sample_igsn_trgm_idx ON sample
      USING gin (public.immutable_unaccent(coalesce(igsn, '')) gin_trgm_ops)
  `.execute(db);
}
