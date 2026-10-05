import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`update sample set type = 'core' where type = 'core.core'`.execute(
    db,
  );
}

export async function down(): Promise<void> {}
