import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table user_sample drop constraint if exists user_sample_role_check`.execute(
    db,
  );
  await sql`alter table user_sample add constraint user_sample_role_check check (role in ('owner', 'editor', 'contributor'))`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from user_sample where role = 'editor'`.execute(db);
  await sql`alter table user_sample drop constraint if exists user_sample_role_check`.execute(
    db,
  );
  await sql`alter table user_sample add constraint user_sample_role_check check (role in ('owner', 'contributor'))`.execute(
    db,
  );
}
