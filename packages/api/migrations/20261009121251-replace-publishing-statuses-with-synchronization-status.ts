import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    rename column publishing_error to synchronization_error
  `.execute(db);
  await sql`
    alter table sample
    add column synchronization_status text
      check (synchronization_status in ('pending', 'synced', 'failed')),
    drop constraint sample_status_check,
    drop constraint sample_status_requires_igsn
  `.execute(db);
  await sql`
    update sample set synchronization_status = case status
      when 'publishing' then 'pending'
      when 'publish_failed' then 'failed'
      else 'synced'
    end
    where status <> 'draft'
  `.execute(db);
  await sql`
    update sample
    set status = case when igsn is null then 'draft' else 'published' end
    where status in ('publishing', 'publish_failed')
  `.execute(db);
  await sql`
    alter table sample
    add constraint sample_status_check
      check (status in ('draft', 'embargo', 'published', 'withdrawn', 'tombstone')),
    add constraint sample_status_requires_igsn
      check (status = 'draft' or igsn is not null)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    drop constraint sample_status_check,
    drop constraint sample_status_requires_igsn
  `.execute(db);
  await sql`
    update sample set status = case synchronization_status
      when 'pending' then 'publishing'
      else 'publish_failed'
    end
    where status = 'draft' and synchronization_status in ('pending', 'failed')
  `.execute(db);
  await sql`
    alter table sample
    drop column synchronization_status,
    add constraint sample_status_check
      check (status in ('draft', 'publishing', 'publish_failed', 'embargo', 'published', 'withdrawn', 'tombstone')),
    add constraint sample_status_requires_igsn
      check (status in ('draft', 'publishing', 'publish_failed') or igsn is not null)
  `.execute(db);
  await sql`
    alter table sample
    rename column synchronization_error to publishing_error
  `.execute(db);
}
