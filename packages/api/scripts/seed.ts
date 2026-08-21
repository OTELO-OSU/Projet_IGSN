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
  institutionalOrganization: string | null;
  institutionalOsu: string | null;
  institutionalLaboratory: string | null;
  manualGroups: string[];
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
  "hugo",
]);
export type ResearcherKey = z.infer<typeof researcherKeySchema>;

export const MOCK_RESEARCHERS: Record<ResearcherKey, SeedUser> = {
  marie: {
    id: "01980e2d-6f9b-7000-8000-000000000001",
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
    orcid: "0000-0001-5109-370X",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7358",
    manualGroups: [
      "01980e2d-6f9b-7000-9000-000000000001",
      "01980e2d-6f9b-7000-9000-000000000003",
    ],
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
    institutionalLaboratory: "UMR7359",
    manualGroups: [
      "01980e2d-6f9b-7000-9000-000000000001",
      "01980e2d-6f9b-7000-9000-000000000008",
    ],
  },
  sophie: {
    id: "01980e2d-6f9b-7000-8000-000000000003",
    email: "sophie.bernard@univ-lorraine.fr",
    name: "Bernard",
    firstname: "Sophie",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "02rx3b187",
    institutionalOsu: "OSUG",
    institutionalLaboratory: "UMR5275",
    manualGroups: ["01980e2d-6f9b-7000-9000-000000000005"],
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
    institutionalLaboratory: "UMR7358",
    manualGroups: [
      "01980e2d-6f9b-7000-9000-000000000002",
      "01980e2d-6f9b-7000-9000-000000000004",
    ],
  },
  camille: {
    id: "01980e2d-6f9b-7000-8000-000000000005",
    email: "camille.petit@univ-lorraine.fr",
    name: "Petit",
    firstname: "Camille",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "014zrew76",
    institutionalOsu: "OSUC",
    institutionalLaboratory: "UMR7327",
    manualGroups: ["01980e2d-6f9b-7000-9000-000000000006"],
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
    institutionalLaboratory: "UMR7327",
    manualGroups: [],
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
    institutionalLaboratory: "UMR7358",
    manualGroups: ["01980e2d-6f9b-7000-9000-000000000003"],
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
    manualGroups: [],
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
    institutionalLaboratory: "UMR7358",
    manualGroups: ["01980e2d-6f9b-7000-9000-00000000000a"],
  },
  hugo: {
    id: "01980e2d-6f9b-7000-8000-00000000000a",
    email: "hugo.fournier@univ-lorraine.fr",
    name: "Fournier",
    firstname: "Hugo",
    status: "pending",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7359",
    manualGroups: [],
  },
};

export const MOCK_MANUAL_GROUPS = [
  { id: "01980e2d-6f9b-7000-9000-000000000001", name: "ANR CritMet" },
  { id: "01980e2d-6f9b-7000-9000-000000000002", name: "ProfilLoire 2024" },
  { id: "01980e2d-6f9b-7000-9000-000000000003", name: "OZCAR-RI" },
  { id: "01980e2d-6f9b-7000-9000-000000000004", name: "ERC DeepTime" },
  { id: "01980e2d-6f9b-7000-9000-000000000005", name: "ChronoAlpes" },
  { id: "01980e2d-6f9b-7000-9000-000000000006", name: "MISTRALS PaleoMex" },
  { id: "01980e2d-6f9b-7000-9000-000000000007", name: "TelluS SYSTER 2025" },
  { id: "01980e2d-6f9b-7000-9000-000000000008", name: "GeoRift" },
  { id: "01980e2d-6f9b-7000-9000-000000000009", name: "CarbOcean" },
  { id: "01980e2d-6f9b-7000-9000-00000000000a", name: "Thesis Girard 2023" },
];

async function seedManagedGroups(
  db: Kysely<DB>,
  ownerIds: Record<ResearcherKey, string>,
): Promise<void> {
  await db
    .insertInto("user_managed_institutional_group")
    .values({ user_id: ownerIds.marie, kind: "osu", code: "OTELo" })
    .onConflict((oc) => oc.doNothing())
    .execute();
}

async function seedManualGroups(
  db: Kysely<DB>,
  ownerIds: Record<ResearcherKey, string>,
): Promise<void> {
  await db
    .insertInto("manual_group")
    .values(MOCK_MANUAL_GROUPS)
    .onConflict((oc) => oc.doNothing())
    .execute();
  await db
    .insertInto("manual_group_member")
    .values(
      researcherKeySchema.options.flatMap((researcher) =>
        MOCK_RESEARCHERS[researcher].manualGroups.map((group_id) => ({
          group_id,
          user_id: ownerIds[researcher],
        })),
      ),
    )
    .onConflict((oc) => oc.doNothing())
    .execute();
}

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
          manualGroups: _manualGroups,
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
  await seedManualGroups(db, ownerIds);
  await seedManagedGroups(db, ownerIds);
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

  const seedById = new Map(parsed.map((row) => [row.id, row]));

  const attached = created.flatMap((sample) =>
    MOCK_RESEARCHERS[seedById.get(sample.id)!.owner].manualGroups.map(
      (group_id) => ({
        sample_id: sample.id,
        group_id,
      }),
    ),
  );
  if (attached.length > 0) {
    await db.insertInto("sample_manual_group").values(attached).execute();
  }

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

export const SEED_SAMPLES: SeedSample[] = [
  {
    id: "00000000-0000-7000-8000-000000000001",
    name: "Fontainebleau Sandstone",
    owner: "marie",
    nature: "rock_powder",
    type: "dredge",
    material: "rock.sedimentary",
    collectionMethod: "dredging.chain_bag",
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
