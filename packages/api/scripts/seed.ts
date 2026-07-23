import type { Kysely, Selectable } from "kysely";
import type { z } from "zod";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { publishedSampleSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import {
  createSampleSchema,
  sampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { fileURLToPath } from "node:url";

import type { DB } from "../src/db.ts";

import { createDb } from "../src/db.ts";
import { descriptionColumns } from "../src/sample/service/description-columns.ts";
import { locationColumns } from "../src/sample/service/to-location.ts";

// Inserts the given samples (with their fixed ids) and returns the columns the
// E2E fixture reads (see e2e/support/db.ts). Shared by the dev seed below and
// the E2E reset-and-seed script. Inserts directly rather than via the
// repository, whose `create` generates a fresh uuid and would discard these
// static ids.
export async function seed(
  db: Kysely<DB>,
  samples: SeedSample[],
): Promise<
  Pick<
    Selectable<DB["sample"]>,
    "id" | "name" | "nature" | "igsn" | "published"
  >[]
> {
  return (
    db
      .insertInto("sample")
      // collectionMethod is camelCase in the domain; the column is snake_case.
      .values(
        samples
          .map(parseSeedSample)
          .map(
            ({
              material,
              collectionMethod,
              collectionMethodDescription,
              specificName,
              metamorphicFacies,
              location,
              description,
              ...rest
            }) => ({
              ...rest,
              material: material ?? null,
              collection_method: collectionMethod ?? null,
              collection_method_description:
                collectionMethodDescription ?? null,
              specific_name: specificName ?? null,
              metamorphic_facies: metamorphicFacies ?? null,
              ...locationColumns(location),
              ...descriptionColumns(description),
            }),
          ),
      )
      .returning(["id", "name", "nature", "igsn", "published"])
      .execute()
  );
}

// created_at/updated_at are database defaults, so they are omitted; the rest
// are optional because a draft seed row may not be classified or published.
export const seedSampleSchema = sampleSchema
  .pick({
    id: true,
    name: true,
    nature: true,
    type: true,
    material: true,
    texture: true,
    metamorphicFacies: true,
    collectionMethod: true,
    collectionMethodDescription: true,
    specificName: true,
    location: true,
    description: true,
    availability: true,
    igsn: true,
    published: true,
  })
  .partial({
    type: true,
    material: true,
    texture: true,
    metamorphicFacies: true,
    collectionMethod: true,
    collectionMethodDescription: true,
    specificName: true,
    location: true,
    description: true,
    availability: true,
    igsn: true,
    published: true,
  });

export type SeedSample = z.infer<typeof seedSampleSchema>;

// A seed row must hold the bar the API enforces on the same data: the create
// schema for a draft, the published schema (publish blockers raised as
// issues) for a published row, since seeding bypasses the publish flow.
// Exported so seed.spec.ts fails the suite on drift, not just the next seed
// run.
export function parseSeedSample(sample: SeedSample): SeedSample {
  const parsed = seedSampleSchema.parse(sample);
  const { id: _id, igsn: _igsn, published, ...create } = parsed;
  const result = (
    published ? publishedSampleSchema : createSampleSchema
  ).safeParse(create);
  if (!result.success) {
    throw new Error(
      `seed row "${parsed.name}" fails its ${published ? "published" : "draft"} schema: ${result.error.message}`,
    );
  }
  return parsed;
}

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
    type: "core.piece",
    material: "rock.metamorphic",
    collectionMethod: null,
  },
  // Published, so they show in the public frontend. Ids reused from the tests;
  // the igsn is derived from the id, matching how publish generates it. A
  // published row must satisfy every publish blocker (leaf material, location
  // position, collection date...); seed() enforces it, since inserting
  // directly bypasses the publish boundary.
  {
    id: "01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69",
    name: "Basalt 42",
    nature: "hand_sample",
    type: "core.half_round",
    material: "rock.igneous.volcanic.mafic.basalt",
    collectionMethod: "blasting",
    location: {
      position: { type: "point", longitude: 2.96, latitude: 45.77 },
    },
    description: {
      collectionDate: { start: "2025-06-15", end: "2025-06-15" },
    },
    availability: "exists",
    igsn: generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69"),
    published: true,
  },
  {
    id: "01890a5d-ac96-774b-bcce-b302099a8057",
    name: "Granite 7",
    nature: "thin_section",
    type: "core.piece",
    material: "rock.igneous.plutonic.felsic.granite",
    collectionMethod: "coring.camera_mounted",
    location: {
      position: { type: "point", longitude: -2.83, latitude: 48.28 },
    },
    description: {
      collectionDate: { start: "2025-04-02", end: "2025-04-02" },
    },
    availability: "exists",
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
