import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    add column publishing_error text,
    drop constraint sample_status_check,
    add constraint sample_status_check
      check (status in ('draft', 'publishing', 'publish_failed', 'published', 'withdrawn', 'tombstone')),
    drop constraint sample_status_requires_igsn,
    add constraint sample_status_requires_igsn
      check (status in ('draft', 'publishing', 'publish_failed') or igsn is not null)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`update sample set status = 'draft' where status in ('publishing', 'publish_failed')`.execute(
    db,
  );
  await sql`
    alter table sample
    drop column publishing_error,
    drop constraint sample_status_check,
    add constraint sample_status_check
      check (status in ('draft', 'published', 'withdrawn', 'tombstone')),
    drop constraint sample_status_requires_igsn,
    add constraint sample_status_requires_igsn
      check (status = 'draft' or igsn is not null)
  `.execute(db);
}
