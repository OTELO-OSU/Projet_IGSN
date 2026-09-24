import type { ControlledReading } from "@projet-igsn/domain/sample/condition/controlled-reading";
import type { StorageCondition } from "@projet-igsn/domain/sample/condition/storage-condition";

import { allowedAvailabilityStatuses } from "@projet-igsn/domain/sample/curation/allowed-availability-statuses";
import { EXISTENCE_STATUSES } from "@projet-igsn/domain/sample/curation/existence-status";
import { MATERIAL_PATHS } from "@projet-igsn/domain/sample/material/classification";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";

import type { Column } from "./columns.ts";

import { DATA_SHEETS, REQUIRED_MARKER } from "./columns.ts";
import { labels } from "./labels.ts";
import {
  DATE_PRECISION_LABEL,
  POSITION_TYPE_LABEL,
  REGION_KIND_LABEL,
  YES_NO_LABEL,
} from "./vocabulary-sheet.ts";

export type ConditionalMatch = "is" | "isNot";

export type ConditionalCondition = {
  path: string;
  level?: number;
  match: ConditionalMatch;
  values: readonly string[];
};

export type ConditionalField = { paths: readonly string[] } & (
  | { condition: ConditionalCondition }
  | { prompt: string }
);

const headerOf = (path: string, level?: number) => {
  const column = DATA_SHEETS.flatMap((sheet) => sheet.columns).find(
    (candidate) => candidate.path === path && candidate.level === level,
  );
  return column === undefined
    ? path
    : column.header.replace(REQUIRED_MARKER, "");
};

const sentenceOf = (condition: ConditionalCondition) => {
  const driver = `"${headerOf(condition.path, condition.level)}"`;
  const values = condition.values.join(" or ");
  switch (condition.match) {
    case "is":
      return `Only when ${driver} is ${values}.`;
    case "isNot":
      return `Leave empty when ${driver} is ${values}.`;
  }
};

const material = (
  level: number,
  match: ConditionalMatch,
  paths: readonly string[],
): ConditionalCondition => {
  const stale = paths.filter(
    (path) =>
      !MATERIAL_PATHS.includes(path) || path.split(".").length !== level,
  );
  if (stale.length > 0)
    throw new Error(
      `Material paths absent from level ${level}: ${stale.join(", ")}`,
    );
  return {
    path: "material",
    level,
    match,
    values: paths.map(labels.materialPathLabel),
  };
};

const controlled = (
  reading: ControlledReading,
  storageCondition: StorageCondition,
): ConditionalField => ({
  paths: [`condition.${reading}`],
  condition: {
    path: "condition.storageConditions",
    match: "is",
    values: [labels.storageConditionLabel(storageCondition)],
  },
});

const hazardExplanation = (
  flag: string,
  explanation: string,
): ConditionalField => ({
  paths: [`security.${explanation}`],
  condition: {
    path: `security.${flag}`,
    match: "is",
    values: [YES_NO_LABEL.true],
  },
});

const availabilityByExistence = EXISTENCE_STATUSES.flatMap((status) => {
  const [only, ...rest] = allowedAvailabilityStatuses(status);
  return only === undefined || rest.length > 0
    ? []
    : [
        `${labels.existenceStatusLabel(status)}: ${labels.availabilityStatusLabel(only)}`,
      ];
}).join("; ");

export const CONDITIONAL_FIELDS: readonly ConditionalField[] = [
  {
    paths: [
      "scientificContext.funderOrganizations",
      "scientificContext.researchProgramName",
      "scientificContext.chiefScientistFirstname",
      "scientificContext.chiefScientistLastname",
      "scientificContext.hostInstitution",
      "scientificContext.funding",
      "scientificContext.researchProgramDescription",
      "scientificContext.platformType",
      "scientificContext.launchPlatformName",
    ],
    condition: {
      path: "scientificContext.provenanceStatus",
      match: "is",
      values: [labels.provenanceStatusLabel("field_sample")],
    },
  },
  {
    paths: [
      "scientificContext.collectionOrigin",
      "scientificContext.collectionContextDescription",
    ],
    condition: {
      path: "scientificContext.provenanceStatus",
      match: "is",
      values: [labels.provenanceStatusLabel("collection_specimen")],
    },
  },
  {
    paths: ["localIdDescription"],
    prompt: `Only when "${headerOf("localId")}" is filled.`,
  },
  {
    paths: ["repository.currentArchiveLaboratory"],
    prompt: `Must belong to the "${headerOf("repository.currentArchiveOsu")}" when one is chosen.`,
  },
  {
    paths: ["description.orientationExplanation"],
    condition: {
      path: "description.oriented",
      match: "is",
      values: [YES_NO_LABEL.true],
    },
  },
  hazardExplanation("radioactivity", "radioactivityExplanation"),
  hazardExplanation("asbestosRich", "asbestosExplanation"),
  hazardExplanation("chemicalRisk", "chemicalRiskExplanation"),
  {
    paths: ["availabilityStatus"],
    prompt: `Restricted by "${headerOf("existenceStatus")}": ${availabilityByExistence}.`,
  },
  {
    paths: ["texture"],
    condition: material(4, "is", [
      "rock_and_sediment.rock.igneous.plutonic",
      "rock_and_sediment.rock.igneous.volcanic",
    ]),
  },
  {
    paths: ["metamorphicFacies", "metamorphicFabric"],
    condition: material(3, "is", ["rock_and_sediment.rock.metamorphic"]),
  },
  {
    paths: ["materialOtherName"],
    condition: material(3, "is", ["rock_and_sediment.rock.other"]),
  },
  {
    paths: ["specificName"],
    condition: material(3, "isNot", ["rock_and_sediment.rock.unknown"]),
  },
  {
    paths: [
      "location",
      "geologicalContextDescription",
      "physiographicEnvironment",
    ],
    condition: material(3, "isNot", [
      "rock_and_sediment.extraterrestrial_rock.returned_samples",
    ]),
  },
  {
    paths: [
      "location.position.longitude",
      "location.position.latitude",
      "location.position.vertical.position",
    ],
    condition: {
      path: "location.position.type",
      match: "is",
      values: [POSITION_TYPE_LABEL.point],
    },
  },
  {
    paths: [
      "location.position.westLongitude",
      "location.position.eastLongitude",
      "location.position.southLatitude",
      "location.position.northLatitude",
      "location.position.vertical.min",
      "location.position.vertical.max",
    ],
    condition: {
      path: "location.position.type",
      match: "is",
      values: [POSITION_TYPE_LABEL.area],
    },
  },
  {
    paths: [
      "location.position.startLongitude",
      "location.position.startLatitude",
      "location.position.endLongitude",
      "location.position.endLatitude",
      "location.position.vertical.start",
      "location.position.vertical.end",
    ],
    condition: {
      path: "location.position.type",
      match: "is",
      values: [POSITION_TYPE_LABEL.line],
    },
  },
  {
    paths: ["location.region.country"],
    condition: {
      path: "location.region.kind",
      level: 1,
      match: "is",
      values: [REGION_KIND_LABEL.country, REGION_KIND_LABEL.ocean],
    },
  },
  {
    paths: ["description.collectionDate.timeZone"],
    condition: {
      path: "description.collectionDate.precision",
      match: "is",
      values: [DATE_PRECISION_LABEL.hour],
    },
  },
  {
    paths: ["age.numericAgeYearsUnit"],
    condition: {
      path: "age.numericAgeUnit",
      match: "is",
      values: [labels.numericUnitLabel("a")],
    },
  },
  controlled("temperature", "temperature_controlled"),
  controlled("humidity", "moisture_controlled"),
  controlled("pressure", "pressure_controlled"),
  controlled("light", "light_controlled"),
];

export const conditionOf = (
  field: ConditionalField,
): ConditionalCondition | undefined =>
  "condition" in field ? field.condition : undefined;

export const columnIndexesOf = (
  columns: readonly Column[],
  path: string,
): number[] =>
  columns.flatMap((column, index) =>
    column.path !== undefined && isPathAtOrUnder(column.path, path)
      ? [index]
      : [],
  );

export const driverIndexOf = (
  columns: readonly Column[],
  condition: ConditionalCondition,
): number =>
  columns.findIndex(
    (column) =>
      column.path === condition.path && column.level === condition.level,
  );

export const conditionalPromptOf = (path: string): string | undefined => {
  const prompts = CONDITIONAL_FIELDS.filter((field) =>
    field.paths.some((governed) => isPathAtOrUnder(path, governed)),
  ).map((field) =>
    "prompt" in field ? field.prompt : sentenceOf(field.condition),
  );
  return prompts.length === 0 ? undefined : prompts.join(" ");
};
