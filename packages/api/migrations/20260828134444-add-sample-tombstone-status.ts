import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    drop constraint sample_status_check,
    add constraint sample_status_check
      check (status in ('draft', 'published', 'withdrawn', 'tombstone'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`update sample set status = 'withdrawn' where status = 'tombstone'`.execute(
    db,
  );
  await sql`
    alter table sample
    drop constraint sample_status_check,
    add constraint sample_status_check
      check (status in ('draft', 'published', 'withdrawn'))
  `.execute(db);
}
