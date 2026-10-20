import type { Kysely } from "kysely";

import { fileURLToPath } from "node:url";

import type { DB } from "../src/db.ts";
import type { ResearcherKey } from "./seed-mock-researchers.ts";
import type { CreatedSample } from "./seed-sample-row.ts";
import type { SeedCollaborator, SeedSample } from "./seed-samples.ts";

import { createDb } from "../src/db.ts";
import { insertSamples } from "./insert-samples.ts";
import { MOCK_RESEARCHERS } from "./seed-mock-researchers.ts";
import { seedMockUsers } from "./seed-mock-users.ts";
import { seedSampleName } from "./seed-sample-name.ts";
import { SEED_SAMPLES } from "./seed-samples.ts";

export async function seed(
  db: Kysely<DB>,
  samples: SeedSample[],
): Promise<
  (CreatedSample & {
    owner: ResearcherKey;
    collaborators: SeedCollaborator[];
  })[]
> {
  const ownerIds = await seedMockUsers(db);
  const created = await insertSamples(
    db,
    samples.map(({ owner, collaborators, ...row }, index) => ({
      ...row,
      name: seedSampleName(index),
      specificName: row.name,
      owner: { ...MOCK_RESEARCHERS[owner], id: ownerIds[owner] },
      collaborators: collaborators?.map(({ researcher, role }) => ({
        userId: ownerIds[researcher],
        role,
      })),
    })),
  );
  const seedById = new Map(samples.map((row) => [row.id, row]));
  return created.map((sample) => {
    const row = seedById.get(sample.id);
    if (!row) throw new Error(`created sample ${sample.id} has no seed row`);
    return {
      ...sample,
      owner: row.owner,
      collaborators: row.collaborators ?? [],
    };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb();
  const created = await seed(db, SEED_SAMPLES);
  for (const sample of created) {
    console.info(`seeded sample "${sample.name}" (${sample.id})`);
  }
  await db.destroy();
}
