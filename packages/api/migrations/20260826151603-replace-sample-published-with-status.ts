import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    add column status text not null default 'draft'
      check (status in ('draft', 'published', 'withdrawn')),
    add constraint sample_status_requires_igsn
      check (status = 'draft' or igsn is not null)
  `.execute(db);
  await sql`update sample set status = 'published' where published`.execute(db);
  await db.schema.alterTable("sample").dropColumn("published").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    add column published boolean not null default false,
    add constraint sample_published_requires_igsn
      check (not published or igsn is not null)
  `.execute(db);
  await sql`update sample set published = true where status <> 'draft'`.execute(
    db,
  );
  await db.schema.alterTable("sample").dropColumn("status").execute();
}
