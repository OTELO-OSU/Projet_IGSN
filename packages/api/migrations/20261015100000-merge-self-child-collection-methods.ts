import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`update sample set collection_method = subpath(collection_method, 0, nlevel(collection_method) - 1) where collection_method in ('coring.coring', 'coring.gravity_corer.gravity_corer', 'coring.piston_corer.piston_corer', 'dredging.dredging', 'grab.grab')`.execute(
    db,
  );
}

export async function down(): Promise<void> {}
