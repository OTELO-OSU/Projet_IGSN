import type { SampleAdditionalRole } from "../additional-role/model.ts";
import type { Location } from "../location/model.ts";
import type { Sample } from "../sample.ts";

import {
  COLLECTION_SPECIMEN,
  FIELD_SAMPLE,
  LINE_SAMPLE,
  SYNTHETIC_DETAILS,
  SYNTHETIC_SAMPLE,
} from "./core-sample-fixture.ts";

type PointVertical = NonNullable<
  Extract<NonNullable<Location["position"]>, { type: "point" }>["vertical"]
>;

const pointSample = (name: string, vertical: PointVertical): Sample => ({
  ...FIELD_SAMPLE,
  name,
  location: {
    position: { type: "point", longitude: 6.18, latitude: 48.69, vertical },
    region: { kind: "continent", country: "FR" },
    navigationType: "DGPS",
    localityName: "Nancy quarry",
    localityDescription: "Northern face of the quarry",
  },
});

const VOLCANIC_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Basalt flow chip",
  material: "rock_and_sediment.rock.igneous.volcanic.mafic.basalt",
  texture: "vesicular",
};

const METAMORPHIC_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Gneiss block",
  material: "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.gneiss",
  texture: null,
  metamorphicFacies: "amphibolite",
  metamorphicFabric: "gneissic",
};

const OTHER_MATERIAL_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Unidentified dark rock",
  material: "rock_and_sediment.rock.other",
  materialOtherName: "Dark fine grained rock",
  texture: null,
};

const MINERAL_RESOURCE_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Gold bearing ore",
  material: "rock_and_sediment.mineral",
  texture: null,
  geomorphologicalEnvironment: "natural_fresh_water.delta",
  geologicalContextDescription: "Shear zone in the Montagne Noire",
  resourceType: "mineral_and_ore.orogenic_gold",
  economicInterestElements: ["u", "fe", "cu"],
  economicResourceTypePrecision: "Shear zone hosted lodes",
  economicDepositName: "Salsigne",
  economicDepositDescription: "A set of orogenic gold lodes",
};

const ELEVATION_SAMPLE = pointSample("Summit outcrop", {
  position: 1200,
  reference: "elevation",
  system: "egm2008",
});

const SEA_FLOOR_SAMPLE = pointSample("Sub sea floor core", {
  position: 35,
  reference: "depth_below_sea_floor",
  system: "local",
});

const CORE_DEPTH_SAMPLE = pointSample("Core depth slice", {
  position: 8,
  reference: "core_depth",
  system: "unknown",
});

const OTHER_REFERENCE_SAMPLE = pointSample("Unreferenced depth", {
  position: 15,
  reference: "other",
  system: null,
});

const COLD_STORED_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Frozen vial",
  description: {
    collectionDate: {
      precision: "day",
      start: "2024-06-01",
      end: "2024-06-01",
    },
    oriented: false,
    orientationExplanation: null,
    openDescription: null,
    length: null,
    width: null,
    thickness: null,
    mass: { value: 30, unit: "mg" },
    volume: { value: 1.5, unit: "l" },
  },
  condition: {
    packaging: "plastic_vial",
    storageConditions: [
      "temperature_controlled",
      "moisture_controlled",
      "light_controlled",
      "pressure_controlled",
    ],
    temperature: {
      type: "frozen",
      measurement: { value: 255.4, unit: "kelvin" },
    },
    humidity: { type: "dry", percentage: 20 },
    light: "total_darkness",
    pressure: { type: "vacuum", measurement: { value: 2, unit: "gpa" } },
    specificConditions: "Stored in a nitrogen cabinet",
  },
};

const WARM_STORED_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Ambient stored chip",
  condition: {
    packaging: "paper_bag",
    storageConditions: ["temperature_controlled", "moisture_controlled"],
    temperature: {
      type: "ambient",
      measurement: { value: 68, unit: "fahrenheit" },
    },
    humidity: { type: "controlled", percentage: 45 },
    light: null,
    pressure: null,
    specificConditions: "Shelf of the teaching collection",
  },
};

const CALENDAR_AGE_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Calibrated radiocarbon sample",
  age: {
    numericAgeMin: 1200,
    numericAgeMax: 1450,
    numericAgeUnit: "a",
    numericAgeYearsUnit: "cal_bp",
    geologicalAgeMin: 1,
    geologicalAgeMax: 2,
    geologicalUnit: "Holocene",
  },
};

const HAZARDOUS_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Asbestos bearing serpentinite",
  security: {
    radioactivity: false,
    radioactivityExplanation: null,
    asbestosRich: true,
    asbestosExplanation: "Chrysotile fibres in the matrix",
    chemicalRisk: true,
    chemicalRiskExplanation: "Arsenic bearing sulfides",
  },
};

const RELATED_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Sample with a legacy parent",
  relations: [
    {
      id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      relationType: "has_metadata",
      identifierType: "url",
      identifier: "https://example.org/metadata/record",
      targetTitle: "Campaign metadata record",
      targetResourceType: "dataset",
      relationTypeInformation: "Discovery metadata of the campaign",
      relatedMetadataScheme: "ISO 19115",
      schemeURI: "https://www.isotc211.org/2005/gmd",
      schemeType: "XSD",
      description: "Published by the data centre",
    },
    {
      id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
      relationType: "is_part_of",
      identifierType: "igsn",
      identifier: "0123456789ABCDEFGHJKMNPQRS",
      targetTitle: "Lorraine collection",
      targetResourceType: "collection",
      relationTypeInformation: null,
      relatedMetadataScheme: null,
      schemeURI: null,
      schemeType: null,
      description: null,
    },
  ],
  parents: [
    {
      id: "cccccccc-3333-4333-8333-cccccccccccc",
      igsn: "CNRS1234567890",
      name: "Legacy parent core",
      material: null,
    },
  ],
  manualGroups: [
    { id: "dddddddd-4444-4444-8444-dddddddddddd", name: "Lorraine survey" },
    { id: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee", name: "Uranium atlas" },
  ],
};

const HOUR_SYNTHESIS_SAMPLE: Sample = {
  ...SYNTHETIC_SAMPLE,
  name: "Run timed to the hour",
  syntheticDetails: {
    ...SYNTHETIC_DETAILS,
    synthesisDate: {
      precision: "hour",
      start: "2025-01-10T09:00",
      end: "2025-01-12T17:30",
      timeZone: "Europe/Paris",
    },
  },
};

const TWO_PARENT_SAMPLE: Sample = {
  ...SYNTHETIC_SAMPLE,
  name: "Blend of two parent blocks",
  parents: [
    {
      id: "ffffffff-6666-4666-8666-ffffffffffff",
      igsn: "0123456789ABCDEFGHJKMNPQRS",
      name: "First parent block",
      material: null,
    },
    {
      id: "99999999-7777-4777-8777-999999999999",
      igsn: "CNRS1234567891",
      name: "Second parent block",
      material: null,
    },
  ],
};

const withAdditionalRoles = (
  sample: Sample,
  name: string,
  additionalRoles: SampleAdditionalRole[],
): Sample => ({
  ...sample,
  name,
  scientificContext:
    sample.scientificContext?.provenanceStatus === "field_sample"
      ? { ...sample.scientificContext, additionalRoles }
      : sample.scientificContext,
});

export const TEAM_SAMPLE = withAdditionalRoles(
  FIELD_SAMPLE,
  "Non-synthetic sample credited to several people per role",
  [
    {
      role: "researcher",
      personFirstname: "Ada",
      personLastname: "Lovelace",
      personOrcid: "0000-0002-1825-0097",
    },
    {
      role: "project_member",
      personFirstname: "Grace",
      personLastname: "Hopper",
      personOrcid: null,
    },
    {
      role: "researcher",
      personFirstname: "Emmy",
      personLastname: "Noether",
      personOrcid: null,
    },
    {
      role: "data_manager",
      personFirstname: "Katherine",
      personLastname: "Johnson",
      personOrcid: null,
    },
    {
      role: "project_manager",
      personFirstname: "Lise",
      personLastname: "Meitner",
      personOrcid: null,
    },
  ],
);

const SYNTHETIC_TEAM_SAMPLE = withAdditionalRoles(
  SYNTHETIC_SAMPLE,
  "Synthetic sample crediting its operator and a researcher",
  [
    {
      role: "researcher",
      personFirstname: "Emmy",
      personLastname: "Noether",
      personOrcid: null,
    },
  ],
);

export const SUB_SAMPLE: Sample = {
  ...FIELD_SAMPLE,
  name: "Thin section of the block",
  processSteps: [
    {
      kind: "subsampling",
      date: { precision: "day", start: "2024-06-05", end: "2024-06-06" },
      description: "Sawn into three slabs",
    },
    { kind: "preparation", date: null, description: null },
  ],
};

export const SYNTHETIC_SUB_SAMPLE: Sample = {
  ...SYNTHETIC_SAMPLE,
  name: "Polished mount of the synthetic glass",
  processSteps: [
    {
      kind: "transformation",
      date: {
        precision: "hour",
        start: "2025-01-15T09:00",
        end: "2025-01-15T11:00",
        timeZone: "Europe/Paris",
      },
      description: "Mounted in epoxy and polished",
    },
  ],
};

export const CORE_SAMPLE_FIXTURES: readonly Sample[] = [
  FIELD_SAMPLE,
  SUB_SAMPLE,
  SYNTHETIC_SUB_SAMPLE,
  COLLECTION_SPECIMEN,
  LINE_SAMPLE,
  SYNTHETIC_SAMPLE,
  HOUR_SYNTHESIS_SAMPLE,
  TWO_PARENT_SAMPLE,
  VOLCANIC_SAMPLE,
  METAMORPHIC_SAMPLE,
  OTHER_MATERIAL_SAMPLE,
  MINERAL_RESOURCE_SAMPLE,
  ELEVATION_SAMPLE,
  SEA_FLOOR_SAMPLE,
  CORE_DEPTH_SAMPLE,
  OTHER_REFERENCE_SAMPLE,
  COLD_STORED_SAMPLE,
  WARM_STORED_SAMPLE,
  CALENDAR_AGE_SAMPLE,
  HAZARDOUS_SAMPLE,
  RELATED_SAMPLE,
  TEAM_SAMPLE,
  SYNTHETIC_TEAM_SAMPLE,
];
