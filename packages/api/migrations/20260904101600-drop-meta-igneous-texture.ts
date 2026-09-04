import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update sample set texture = null
    where material <@ 'rock.metamorphic.weakly_metamorphosed.meta_igneous_rock'
  `.execute(db);
}

export async function down(): Promise<void> {}
