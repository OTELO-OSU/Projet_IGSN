import { type Kysely, sql } from "kysely";

// The constraint added by 20260731144205-add-user-sample-role.ts is unnamed, so
// Postgres named it user_sample_role_check.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table user_sample drop constraint if exists user_sample_role_check`.execute(
    db,
  );
  await sql`alter table user_sample add constraint user_sample_role_check check (role in ('owner', 'editor', 'contributor'))`.execute(
    db,
  );
}

// Narrowing back drops the editor grants, since the constraint is validated
// against existing rows and would otherwise refuse to be re-added.
export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from user_sample where role = 'editor'`.execute(db);
  await sql`alter table user_sample drop constraint if exists user_sample_role_check`.execute(
    db,
  );
  await sql`alter table user_sample add constraint user_sample_role_check check (role in ('owner', 'contributor'))`.execute(
    db,
  );
}
