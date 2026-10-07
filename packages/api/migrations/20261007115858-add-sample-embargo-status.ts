import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    drop constraint sample_status_check,
    add constraint sample_status_check
      check (status in ('draft', 'publishing', 'publish_failed', 'embargo', 'published', 'withdrawn', 'tombstone')),
    add constraint sample_embargo_requires_published_at
      check (status <> 'embargo' or published_at is not null)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`update sample set status = 'withdrawn' where status = 'embargo'`.execute(
    db,
  );
  await sql`
    alter table sample
    drop constraint sample_embargo_requires_published_at,
    drop constraint sample_status_check,
    add constraint sample_status_check
      check (status in ('draft', 'publishing', 'publish_failed', 'published', 'withdrawn', 'tombstone'))
  `.execute(db);
}
