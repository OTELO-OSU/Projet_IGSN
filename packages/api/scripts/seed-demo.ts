import type { Kysely } from "kysely";

import { sql } from "kysely";

import type { DB } from "../src/db.ts";
import type { SampleOwner } from "./seed.ts";

import { createDb } from "../src/db.ts";
import { deleteOrphanLocations } from "../src/sample/service/delete-orphan-locations.ts";
import { inheritParentLocation } from "../src/sample/service/inherit-parent-location.ts";
import { replaceSampleAdditionalRoles } from "../src/sample/service/replace-sample-additional-roles.ts";
import { replaceSampleChildren } from "../src/sample/service/replace-sample-children.ts";
import { replaceSampleMineralClassifications } from "../src/sample/service/replace-sample-mineral-classifications.ts";
import { replaceSampleProcessSteps } from "../src/sample/service/replace-sample-process-steps.ts";
import {
  DEMO_ADDITIONAL_ROLES,
  DEMO_CHILDREN,
  DEMO_MINERAL_CLASSIFICATIONS,
  DEMO_PARENTS,
  DEMO_PROCESS_STEPS,
  DEMO_SAMPLES,
} from "./seed-demo-samples.ts";
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
await db.deleteFrom("sample_relation").execute();
await db.deleteFrom("sample").execute();
const created = await insertSamples(
  db,
  DEMO_SAMPLES.map((row, index) => ({
    ...row,
    mineralClassifications: DEMO_MINERAL_CLASSIFICATIONS[row.name],
    owner: owners[index % owners.length]!,
  })),
);

const idByName = new Map(created.map(({ id, name }) => [name, id]));
const sampleId = (name: string): string => {
  const id = idByName.get(name);
  if (!id) {
    throw new Error(`DEMO_PARENTS names an unknown sample: "${name}"`);
  }
  return id;
};
const parentRows = Object.entries(DEMO_PARENTS).flatMap(([child, parents]) =>
  parents.map((parent) => ({
    sample_id: sampleId(child),
    parent_id: sampleId(parent),
  })),
);
if (parentRows.length > 0) {
  await db.insertInto("sample_parent").values(parentRows).execute();
}
for (const [series, children] of Object.entries(DEMO_CHILDREN)) {
  await replaceSampleChildren(db, sampleId(series), children.map(sampleId));
}
// DEMO_PARENTS lists parents before their children, so each copy reads a settled location.
for (const [child, parents] of Object.entries(DEMO_PARENTS)) {
  if (parents.length === 1) {
    await inheritParentLocation(db, sampleId(child), sampleId(parents[0]!));
  }
}
await deleteOrphanLocations(db);
for (const [name, steps] of Object.entries(DEMO_PROCESS_STEPS)) {
  await replaceSampleProcessSteps(db, sampleId(name), steps);
}
for (const [name, roles] of Object.entries(DEMO_ADDITIONAL_ROLES)) {
  await replaceSampleAdditionalRoles(db, sampleId(name), roles);
}
for (const [name, rows] of Object.entries(DEMO_MINERAL_CLASSIFICATIONS)) {
  await replaceSampleMineralClassifications(db, sampleId(name), rows);
}
await db.destroy();

console.info(
  `seeded ${created.length} demo samples and ${parentRows.length} parent links`,
);
