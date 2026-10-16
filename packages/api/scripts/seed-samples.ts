import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { collaboratorRoleSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { z } from "zod";

import { researcherKeySchema } from "./seed-mock-researchers.ts";
import { sampleRowSchema } from "./seed-sample-row.ts";

const SEED_REPOSITORY = {
  currentArchiveOsu: "OASU",
  currentArchiveLaboratory: "UMR5805",
  rightsHolder: ["03fd77x13"],
  currentArchiveContactFirstname: "Camille",
  currentArchiveContactLastname: "Durand",
  currentArchiveContactEmail: "archive@example.org",
  collectionName: "National rock reference collection",
};

const seedSampleSchema = sampleRowSchema.extend({
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

export type SeedSample = z.input<typeof seedSampleSchema>;

export type SeedCollaborator = NonNullable<SeedSample["collaborators"]>[number];

const publishedAsh = (
  id: string,
  name: string,
  nature: SeedSample["nature"],
  position?: { longitude: number; latitude: number },
): SeedSample => ({
  id,
  name,
  owner: "pierre",
  nature,
  type: "individual_sample",
  material: "rock_and_sediment.sediment.volcano_detritic.ash",
  collectionMethod: "manual",
  ...(position
    ? { location: { position: { type: "point", ...position } } }
    : {}),
  description: {
    collectionDate: {
      precision: "day",
      start: "2025-05-20",
      end: "2025-05-20",
    },
  },
  existenceStatus: "exists",
  availabilityStatus: "available",
  scientificContext: {
    provenanceStatus: "collection_specimen",
    collectionOrigin: "scientific_expedition",
    collectionContextDescription: "Volcanic ash reference collection",
  },
  repository: SEED_REPOSITORY,
  igsn: generateIgsnSuffix(id),
  status: "published",
});

export const SEED_SAMPLES: SeedSample[] = [
  {
    id: "00000000-0000-7000-8000-000000000001",
    name: "Fontainebleau Sandstone",
    owner: "marie",
    nature: "powder",
    type: "dredge",
    material: "rock_and_sediment.rock.sedimentary",
    collectionMethod: "dredging.chain_bag",
    collaborators: [{ researcher: "camille", role: "editor" }],
  },
  {
    id: "00000000-0000-7000-8000-000000000002",
    name: "Massif Central Basalt",
    owner: "jean",
    nature: "hand_sample",
    type: "core.section",
    material: "rock_and_sediment.rock.igneous",
    collectionMethod: "coring.gravity_corer.giant",
  },
  {
    id: "00000000-0000-7000-8000-000000000003",
    name: "Brittany Granite",
    owner: "sophie",
    nature: "thin_section",
    type: "core.piece",
    material: "rock_and_sediment.rock.igneous",
    collectionMethod: "coring",
  },
  {
    id: "00000000-0000-7000-8000-000000000004",
    name: "Jura Limestone",
    owner: "pierre",
    nature: "rock_chips",
    type: "dredge",
    material: "rock_and_sediment.rock.sedimentary",
    collectionMethod: "grab.rov",
  },
  {
    id: "00000000-0000-7000-8000-000000000005",
    name: "Ardennes Schist",
    owner: "camille",
    nature: "polished_section",
    type: "core.piece",
    material: "rock_and_sediment.rock.metamorphic",
    collectionMethod: null,
  },
  {
    id: "01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69",
    name: "Basalt 42",
    owner: "jean",
    nature: "hand_sample",
    type: "core.half_round",
    material: "rock_and_sediment.rock.igneous.volcanic.mafic.basalt",
    collectionMethod: "blasting",
    location: {
      position: { type: "point", longitude: 2.96, latitude: 45.77 },
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "2025-06-15",
        end: "2025-06-15",
      },
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
    existenceStatus: "exists",
    availabilityStatus: "available",
    scientificContext: {
      provenanceStatus: "research_project_sample",
      funderOrganizations: ["02feahw73"],
      researchProgramName: "Chaîne des Puys Survey",
      chiefScientistFirstname: "Jean",
      chiefScientistLastname: "Dupont",
      hostInstitution: ["02rx3b187"],
      collectorFirstname: "Claire",
      collectorLastname: "Martin",
    },
    repository: SEED_REPOSITORY,
    igsn: generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69"),
    status: "published",
  },
  {
    id: "01890a5d-ac96-774b-bcce-b302099a8057",
    name: "Granite 7",
    owner: "pierre",
    nature: "thin_section",
    type: "core.piece",
    material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
    collectionMethod: "coring.camera_mounted",
    location: {
      position: { type: "point", longitude: -2.83, latitude: 48.28 },
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "2025-04-02",
        end: "2025-04-02",
      },
    },
    existenceStatus: "exists",
    availabilityStatus: "available",
    scientificContext: {
      provenanceStatus: "collection_specimen",
      collectionOrigin: "scientific_expedition",
      collectionContextDescription: "Armorican Massif reference collection",
    },
    repository: SEED_REPOSITORY,
    igsn: generateIgsnSuffix("01890a5d-ac96-774b-bcce-b302099a8057"),
    status: "published",
  },
  {
    id: "01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a70",
    name: "Rhyolite 11",
    owner: "jean",
    nature: "hand_sample",
    type: "core.half_round",
    material: "rock_and_sediment.rock.igneous.volcanic.felsic.rhyolite",
    collectionMethod: "blasting",
    location: {
      region: { kind: "country", country: "FR" },
      localityName: "Mont-Dore",
      position: { type: "point", longitude: 2.81, latitude: 45.57 },
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "2025-07-01",
        end: "2025-07-01",
      },
    },
    existenceStatus: "exists",
    availabilityStatus: "available",
    scientificContext: {
      provenanceStatus: "research_project_sample",
      funderOrganizations: ["02feahw73"],
      researchProgramName: "Chaîne des Puys Survey",
      chiefScientistFirstname: "Jean",
      chiefScientistLastname: "Dupont",
      hostInstitution: ["02rx3b187"],
      collectorFirstname: "Claire",
      collectorLastname: "Martin",
    },
    repository: SEED_REPOSITORY,
    igsn: generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a70"),
    status: "withdrawn",
  },
  {
    id: "01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a71",
    name: "Rhyolite 12",
    owner: "jean",
    nature: "hand_sample",
    type: "core.half_round",
    material: "rock_and_sediment.rock.igneous.volcanic.felsic.rhyolite",
    collectionMethod: "blasting",
    location: {
      region: { kind: "country", country: "FR" },
      localityName: "Mont-Dore",
      position: { type: "point", longitude: 2.81, latitude: 45.57 },
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "2025-07-01",
        end: "2025-07-01",
      },
    },
    existenceStatus: "exists",
    availabilityStatus: "available",
    scientificContext: {
      provenanceStatus: "research_project_sample",
      funderOrganizations: ["02feahw73"],
      researchProgramName: "Chaîne des Puys Survey",
      chiefScientistFirstname: "Jean",
      chiefScientistLastname: "Dupont",
      hostInstitution: ["02rx3b187"],
      collectorFirstname: "Claire",
      collectorLastname: "Martin",
    },
    repository: SEED_REPOSITORY,
    igsn: generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a71"),
    status: "tombstone",
  },
  {
    id: "00000000-0000-7000-8000-000000000008",
    name: "Import failed andesite",
    owner: "jean",
    nature: "hand_sample",
    type: "core.piece",
    material: "rock_and_sediment.rock.igneous.volcanic.intermediate.andesite",
    collectionMethod: "blasting",
    location: {
      position: { type: "point", longitude: 2.75, latitude: 45.63 },
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "2026-05-10",
        end: "2026-05-10",
      },
    },
    existenceStatus: "exists",
    availabilityStatus: "available",
    scientificContext: {
      provenanceStatus: "research_project_sample",
      funderOrganizations: ["02feahw73"],
      researchProgramName: "Chaîne des Puys Survey",
      chiefScientistFirstname: "Jean",
      chiefScientistLastname: "Dupont",
      hostInstitution: ["02rx3b187"],
      collectorFirstname: "Claire",
      collectorLastname: "Martin",
    },
    repository: SEED_REPOSITORY,
    synchronizationStatus: "failed",
    synchronizationError: "DataCite registration failed (HTTP 500)",
  },
  {
    id: "00000000-0000-7000-8000-000000000009",
    name: "Baikal Marble",
    owner: "marie",
    nature: "sample_fragment",
    type: "individual_sample",
    material:
      "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.marble",
    collectionMethod: "manual",
    location: {
      position: { type: "point", longitude: 108.0, latitude: 53.5 },
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "2025-02-18",
        end: "2025-02-18",
      },
    },
    existenceStatus: "exists",
    availabilityStatus: "available",
    scientificContext: {
      provenanceStatus: "research_project_sample",
      funderOrganizations: ["02feahw73"],
      researchProgramName: "Baikal Marble Survey",
      chiefScientistFirstname: "Marie",
      chiefScientistLastname: "Dupont",
      hostInstitution: ["02rx3b187"],
    },
    repository: SEED_REPOSITORY,
    igsn: generateIgsnSuffix("00000000-0000-7000-8000-000000000009"),
    status: "published",
    existingBlockers: [
      "collector_firstname_missing",
      "collector_lastname_missing",
    ],
  },
  {
    id: "00000000-0000-7000-8000-000000000006",
    name: "Awaiting validation basalt",
    owner: "theo",
    nature: "hand_sample",
    material: "rock_and_sediment.rock.igneous.volcanic",
  },
  {
    id: "00000000-0000-7000-8000-000000000007",
    name: "Awaiting validation sediment core",
    owner: "theo",
    nature: "sample_fragment",
    material: "rock_and_sediment.sediment",
    type: "core",
  },
  publishedAsh(
    "00000000-0000-7000-8000-000000000101",
    "Vesuvius Ash",
    "powder",
    { longitude: 14.43, latitude: 40.82 },
  ),
  publishedAsh(
    "00000000-0000-7000-8000-000000000102",
    "Etna Ash",
    "rock_chips",
    { longitude: 15.0, latitude: 37.75 },
  ),
  publishedAsh("00000000-0000-7000-8000-000000000103", "Fuji Ash", "powder", {
    longitude: 138.73,
    latitude: 35.36,
  }),
  publishedAsh(
    "00000000-0000-7000-8000-000000000104",
    "Nowhere Ash",
    "rock_chips",
  ),
];
