import type { CollectionMethod } from "@projet-igsn/domain/sample/collection-method";
import type { MaterialPath } from "@projet-igsn/domain/sample/material";
import type { Nature } from "@projet-igsn/domain/sample/nature";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { SampleType } from "@projet-igsn/domain/sample/type";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { fileURLToPath } from "node:url";

import type { DB } from "../src/db.ts";

import { createDb } from "../src/db.ts";
import { toSample } from "../src/sample/service/to-sample.ts";

// Inserts the given samples (with their fixed ids) and returns the created
// rows. Shared by the dev seed below and the E2E reset-and-seed script.
// Inserts directly rather than via the repository, whose `create` generates a
// fresh uuid and would discard these static ids.
export async function seed(
  db: Kysely<DB>,
  samples: SeedSample[],
): Promise<Sample[]> {
  const rows = await db
    .insertInto("sample")
    // collectionMethod is camelCase in the domain; the column is snake_case.
    .values(
      samples.map(({ material, collectionMethod, ...rest }) => ({
        ...rest,
        material: material ?? null,
        collection_method: collectionMethod ?? null,
      })),
    )
    .returningAll()
    .execute();
  return rows.map(toSample);
}

type SeedSample = {
  id: string;
  name: string;
  nature: Nature;
  type?: SampleType | null;
  material?: MaterialPath;
  collectionMethod?: CollectionMethod | null;
  igsn?: string;
  published?: boolean;
};

// Shared seed data, reused by the E2E reset (see scripts/reset-and-seed.ts), so
// kept English per the i18n testing rule. Ids are static (not generated) so
// tests and future features can reference a seed row by a known id; they stay
// sorted like the app's uuidv7 keys. Only the published rows below are visible
// on the public frontend; the frontend detail E2E asserts the first published
// row's nature (`hand_sample`). Run this script directly
// (`pnpm -F @projet-igsn/api seed`) to populate the local dev database;
// importing this module does not seed.
export const SEED_SAMPLES: SeedSample[] = [
  {
    id: "00000000-0000-7000-8000-000000000001",
    name: "Fontainebleau Sandstone",
    nature: "rock_powder",
    type: "dredge",
    material: "rock.sedimentary",
    collectionMethod: "dredging.chain_bag",
  },
  {
    id: "00000000-0000-7000-8000-000000000002",
    name: "Massif Central Basalt",
    nature: "hand_sample",
    type: "core.section",
    material: "rock.igneous",
    collectionMethod: "coring.gravity_corer.giant",
  },
  {
    id: "00000000-0000-7000-8000-000000000003",
    name: "Brittany Granite",
    nature: "thin_section",
    type: "core.piece",
    material: "rock.igneous",
    collectionMethod: "coring",
  },
  {
    id: "00000000-0000-7000-8000-000000000004",
    name: "Jura Limestone",
    nature: "rock_chips",
    type: "dredge",
    material: "rock.sedimentary",
    collectionMethod: "grab.rov",
  },
  {
    id: "00000000-0000-7000-8000-000000000005",
    name: "Ardennes Schist",
    nature: "polished_section",
    type: null,
    material: "rock.metamorphic",
    collectionMethod: null,
  },
  // Published, so they show in the public frontend. Ids reused from the tests;
  // the igsn is derived from the id, matching how publish generates it. A
  // published sample must carry a leaf material path (enforced at the publish
  // boundary).
  {
    id: "01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69",
    name: "Basalt 42",
    nature: "hand_sample",
    type: null,
    material: "rock.igneous",
    collectionMethod: null,
    igsn: generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69"),
    published: true,
  },
  {
    id: "01890a5d-ac96-774b-bcce-b302099a8057",
    name: "Granite 7",
    nature: "thin_section",
    type: null,
    material: "rock.igneous",
    collectionMethod: null,
    igsn: generateIgsnSuffix("01890a5d-ac96-774b-bcce-b302099a8057"),
    published: true,
  },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb();
  const created = await seed(db, SEED_SAMPLES);
  for (const sample of created) {
    console.info(`seeded sample "${sample.name}" (${sample.id})`);
  }
  await db.destroy();
}
