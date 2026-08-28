import type { Kysely } from "kysely";

import { sql } from "kysely";

import type { DB } from "../src/db.ts";
import type { SampleOwner } from "./seed.ts";

import { createDb } from "../src/db.ts";
import { DEMO_SAMPLES } from "./seed-demo-samples.ts";
import { insertSamples, seedMockUsers } from "./seed.ts";

const listAcceptedOwners = (db: Kysely<DB>): Promise<SampleOwner[]> =>
  db
    .selectFrom("user")
    .select([
      "id",
      "institutional_organization as institutionalOrganization",
      "institutional_osu as institutionalOsu",
      "institutional_laboratory as institutionalLaboratory",
      sql<string[]>`coalesce((
        select array_agg(group_id order by group_id)
          from manual_group_member
         where manual_group_member.user_id = "user".id
      ), '{}')`.as("manualGroups"),
    ])
    .where("status", "=", "accepted")
    .orderBy("id")
    .execute();

const db = createDb();
if (process.argv.includes("--with-users")) {
  await seedMockUsers(db);
}

const owners = await listAcceptedOwners(db);
if (owners.length === 0) {
  await db.destroy();
  console.error(
    "no accepted user to own the demo samples: accept one first, or pass --with-users to seed the mock researchers",
  );
  process.exit(1);
}

await db.deleteFrom("sample_attachment").execute();
await db.deleteFrom("sample_link").execute();
await db.deleteFrom("sample").execute();
const created = await insertSamples(
  db,
  DEMO_SAMPLES.map((row, index) => ({
    ...row,
    owner: owners[index % owners.length]!,
  })),
);
await db.destroy();

console.info(`seeded ${created.length} demo samples`);
