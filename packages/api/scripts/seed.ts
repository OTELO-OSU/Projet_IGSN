import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { Kysely, Selectable } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { publishedSampleSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import {
  createSampleSchema,
  sampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { collaboratorRoleSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import type { DB } from "../src/db.ts";

import { createDb } from "../src/db.ts";
import { descriptionColumns } from "../src/sample/service/description-columns.ts";
import { scientificContextColumns } from "../src/sample/service/scientific-context-columns.ts";
import { toAgeColumns } from "../src/sample/service/to-age-columns.ts";
import { locationColumns } from "../src/sample/service/to-location.ts";

type SeedUser = {
  id: string;
  email: string;
  name: string;
  firstname: string;
  orcid?: string;
  status: UserStatus;
  superAdmin: boolean;
  // Must satisfy setInstitutionalGroupsSchema, or the seed writes affiliations
  // the api itself would refuse.
  institutionalOrganization: string | null;
  institutionalOsu: string | null;
  institutionalLaboratory: string | null;
};

export const researcherKeySchema = z.enum([
  "marie",
  "jean",
  "sophie",
  "pierre",
  "camille",
  "luc",
  "nadia",
  "theo",
  "chloe",
]);
export type ResearcherKey = z.infer<typeof researcherKeySchema>;

// Ids are static v7-shaped uuids like the sample ids; the api adopts these rows
// by email when the real account signs in (see src/user/repository.ts), which is
// what keeps the ownership. Everyone but theo carries institutional groups, so
// signing in lands on the dashboard rather than on the groups gate; theo is the
// first-login fixture.
export const MOCK_RESEARCHERS: Record<ResearcherKey, SeedUser> = {
  marie: {
    id: "01980e2d-6f9b-7000-8000-000000000001",
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
    orcid: "0000-0001-5109-3700",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "CRPG",
  },
  jean: {
    id: "01980e2d-6f9b-7000-8000-000000000002",
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "GEORESSOURCES",
  },
  sophie: {
    id: "01980e2d-6f9b-7000-8000-000000000003",
    email: "sophie.bernard@univ-lorraine.fr",
    name: "Bernard",
    firstname: "Sophie",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04kdfz702",
    institutionalOsu: "OSUG",
    institutionalLaboratory: "ISTERRE",
  },
  pierre: {
    id: "01980e2d-6f9b-7000-8000-000000000004",
    email: "pierre.durand@univ-lorraine.fr",
    name: "Durand",
    firstname: "Pierre",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "CRPG",
  },
  camille: {
    id: "01980e2d-6f9b-7000-8000-000000000005",
    email: "camille.petit@univ-lorraine.fr",
    name: "Petit",
    firstname: "Camille",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04kdfz702",
    institutionalOsu: "OSUR",
    institutionalLaboratory: "GEOSCIENCES-RENNES",
  },
  luc: {
    id: "01980e2d-6f9b-7000-8000-000000000006",
    email: "luc.moreau@univ-lorraine.fr",
    name: "Moreau",
    firstname: "Luc",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "05hnb7x64",
    institutionalOsu: null,
    institutionalLaboratory: "LAB-BRGM",
  },
  nadia: {
    id: "01980e2d-6f9b-7000-8000-000000000007",
    email: "nadia.leroy@univ-lorraine.fr",
    name: "Leroy",
    firstname: "Nadia",
    status: "accepted",
    superAdmin: true,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "CRPG",
  },
  theo: {
    id: "01980e2d-6f9b-7000-8000-000000000008",
    email: "theo.roux@univ-lorraine.fr",
    name: "Roux",
    firstname: "Theo",
    status: "pending",
    superAdmin: false,
    institutionalOrganization: null,
    institutionalOsu: null,
    institutionalLaboratory: null,
  },
  chloe: {
    id: "01980e2d-6f9b-7000-8000-000000000009",
    email: "chloe.girard@univ-lorraine.fr",
    name: "Girard",
    firstname: "Chloe",
    status: "rejected",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "CRPG",
  },
};

// Upserts the mock researchers by email (a row may already exist from a real
// sign-in, with another id) and returns each researcher's database id.
async function seedOwners(
  db: Kysely<DB>,
): Promise<Record<ResearcherKey, string>> {
  const owners = Object.values(MOCK_RESEARCHERS);
  await db
    .insertInto("user")
    .values(
      owners.map(
        ({
          superAdmin,
          institutionalOrganization,
          institutionalOsu,
          institutionalLaboratory,
          ...owner
        }) => ({
          ...owner,
          super_admin: superAdmin,
          institutional_organization: institutionalOrganization,
          institutional_osu: institutionalOsu,
          institutional_laboratory: institutionalLaboratory,
        }),
      ),
    )
    .onConflict((oc) =>
      oc.column("email").doUpdateSet((eb) => ({
        status: eb.ref("excluded.status"),
        super_admin: eb.ref("excluded.super_admin"),
        // Re-applied like the moderation state: the api sets groups once and
        // never again, so without this a previous run's groups would stick to
        // theo and the first-login e2e would pass only on a virgin database.
        institutional_organization: eb.ref(
          "excluded.institutional_organization",
        ),
        institutional_osu: eb.ref("excluded.institutional_osu"),
        institutional_laboratory: eb.ref("excluded.institutional_laboratory"),
      })),
    )
    .execute();
  const rows = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where(
      "email",
      "in",
      owners.map((owner) => owner.email),
    )
    .execute();
  const idByEmail = new Map(rows.map((row) => [row.email, row.id]));
  return Object.fromEntries(
    researcherKeySchema.options.map((key) => {
      const id = idByEmail.get(MOCK_RESEARCHERS[key].email);
      if (!id) throw new Error(`owner ${key} missing after upsert`);
      return [key, id];
    }),
  ) as Record<ResearcherKey, string>;
}

// Inserts directly rather than via the repository, whose `create` generates a
// fresh uuid and would discard these static ids.
export async function seed(
  db: Kysely<DB>,
  samples: SeedSample[],
): Promise<
  (Pick<
    Selectable<DB["sample"]>,
    "id" | "name" | "nature" | "igsn" | "published"
  > & { owner: ResearcherKey; collaborators: SeedCollaborator[] })[]
> {
  const ownerIds = await seedOwners(db);
  const parsed = samples.map(parseSeedSample);
  const created = await db
    .insertInto("sample")
    .values(
      parsed.map(
        ({
          owner,
          collaborators: _collaborators,
          material,
          collectionMethod,
          collectionMethodDescription,
          specificName,
          metamorphicFacies,
          location,
          description,
          scientificContext,
          age,
          ...rest
        }) => ({
          ...rest,
          material: material ?? null,
          collection_method: collectionMethod ?? null,
          collection_method_description: collectionMethodDescription ?? null,
          specific_name: specificName ?? null,
          metamorphic_facies: metamorphicFacies ?? null,
          ...toAgeColumns(age),
          ...locationColumns(location),
          ...descriptionColumns(description),
          ...scientificContextColumns(scientificContext),
          // Snapshot of the owner's affiliation, the way insert-sample.ts copies
          // the creator's groups.
          institutional_organization:
            MOCK_RESEARCHERS[owner].institutionalOrganization,
          institutional_osu: MOCK_RESEARCHERS[owner].institutionalOsu,
          institutional_laboratory:
            MOCK_RESEARCHERS[owner].institutionalLaboratory,
        }),
      ),
    )
    .returning(["id", "name", "nature", "igsn", "published"])
    .execute();

  await db
    .insertInto("user_sample")
    .values(
      parsed.flatMap((row) => [
        {
          sample_id: row.id,
          user_id: ownerIds[row.owner],
          role: "owner" as const,
        },
        ...(row.collaborators ?? []).map(({ researcher, role }) => ({
          sample_id: row.id,
          user_id: ownerIds[researcher],
          role,
        })),
      ]),
    )
    .execute();

  // Matched by id, not by array position: RETURNING order is not guaranteed.
  const seedById = new Map(parsed.map((row) => [row.id, row]));
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
    scientificContext: true,
    age: true,
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
    scientificContext: true,
    age: true,
    igsn: true,
    published: true,
  })
  // Seed metadata (user_sample rows), not sample columns.
  .extend({
    owner: researcherKeySchema,
    collaborators: z
      .array(
        z.object({
          researcher: researcherKeySchema,
          role: collaboratorRoleSchema,
        }),
      )
      .optional(),
  });

export type SeedSample = z.infer<typeof seedSampleSchema>;

export type SeedCollaborator = NonNullable<SeedSample["collaborators"]>[number];

// A seed row must hold the bar the API enforces on the same data: the create
// schema for a draft, the published schema (publish blockers raised as
// issues) for a published row, since seeding bypasses the publish flow.
export function parseSeedSample(sample: SeedSample): SeedSample {
  const parsed = seedSampleSchema.parse(sample);
  const {
    id: _id,
    igsn: _igsn,
    owner: _owner,
    collaborators: _collaborators,
    published,
    ...create
  } = parsed;
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

// Only the published rows below are visible on the public frontend; the frontend
// detail E2E asserts the first published row's nature (`hand_sample`).
export const SEED_SAMPLES: SeedSample[] = [
  {
    id: "00000000-0000-7000-8000-000000000001",
    name: "Fontainebleau Sandstone",
    owner: "marie",
    nature: "rock_powder",
    type: "dredge",
    material: "rock.sedimentary",
    collectionMethod: "dredging.chain_bag",
    // Camille is an invited editor here, so the E2E editor journey can sign in
    // as one without being invited through the UI first.
    collaborators: [{ researcher: "camille", role: "editor" }],
  },
  {
    id: "00000000-0000-7000-8000-000000000002",
    name: "Massif Central Basalt",
    owner: "jean",
    nature: "hand_sample",
    type: "core.section",
    material: "rock.igneous",
    collectionMethod: "coring.gravity_corer.giant",
  },
  {
    id: "00000000-0000-7000-8000-000000000003",
    name: "Brittany Granite",
    owner: "sophie",
    nature: "thin_section",
    type: "core.piece",
    material: "rock.igneous",
    collectionMethod: "coring",
  },
  {
    id: "00000000-0000-7000-8000-000000000004",
    name: "Jura Limestone",
    owner: "pierre",
    nature: "rock_chips",
    type: "dredge",
    material: "rock.sedimentary",
    collectionMethod: "grab.rov",
  },
  {
    id: "00000000-0000-7000-8000-000000000005",
    name: "Ardennes Schist",
    owner: "camille",
    nature: "polished_section",
    type: "core.piece",
    material: "rock.metamorphic",
    collectionMethod: null,
  },
  {
    id: "01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69",
    name: "Basalt 42",
    owner: "jean",
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
    // A numeric age so the age-range facet E2E has one published sample to
    // match; Granite 7 has none, so any age bound narrows to this one.
    age: {
      numericAgeMin: 2,
      numericAgeMax: 6,
      numericAgeUnit: "ma",
      numericAgeYearsUnit: null,
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    },
    availability: "exists",
    scientificContext: {
      provenanceStatus: "recent_collection",
      funderOrganization: "02feahw73",
      researchProgramName: "Chaîne des Puys Survey",
      researchProgramChief: "Jean Dupont",
      researchStructure: ["02rx3b187"],
      collectorName: "Claire Martin",
    },
    igsn: generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69"),
    published: true,
  },
  {
    id: "01890a5d-ac96-774b-bcce-b302099a8057",
    name: "Granite 7",
    owner: "pierre",
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
    scientificContext: {
      provenanceStatus: "historical_specimen",
      collectionCurator: "Paul Bernard",
      collectionOrigin: "scientific_expedition",
      collectionContextDescription: "Armorican Massif reference collection",
    },
    igsn: generateIgsnSuffix("01890a5d-ac96-774b-bcce-b302099a8057"),
    published: true,
  },
  {
    id: "00000000-0000-7000-8000-000000000006",
    name: "Awaiting validation basalt",
    owner: "theo",
    nature: "hand_sample",
    material: "rock.igneous.volcanic",
  },
  {
    id: "00000000-0000-7000-8000-000000000007",
    name: "Awaiting validation sediment core",
    owner: "theo",
    nature: "sample_fragment",
    material: "sediment",
    type: "core",
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
