import { publishBlockerSchema } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import type { LocationDraft } from "#/samples/compose-location.ts";

import { m } from "#/paraglide/messages.js";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";

const MEASUREMENT_PATH =
  /^(description|syntheticDetails)\.(\w+)\.(value|unit)$/;

const READING_PATH =
  /^(condition)\.(temperature|pressure)\.measurement\.(value|unit)$/;

const DATE_RANGE_PATH =
  /^(description\.collectionDate|syntheticDetails\.synthesisDate)(?:\.(start|end|timeZone))?$/;

const DATE_RANGE_SUFFIXES: Record<string, string> = {
  start: "Start",
  end: "End",
  timeZone: "TimeZone",
};

const RELATION_PATH = /^relations\.(\d+)\.(\w+)$/;

const RELATION_REQUIRED_CODES = ["invalid_type", "invalid_value", "too_small"];

const VERTICAL_PREFIX = "location.position.vertical.";

const VERTICAL_FIELDS: Record<string, keyof LocationDraft> = {
  position: "verticalPosition",
  min: "verticalPositionMin",
  max: "verticalPositionMax",
  start: "startVerticalPosition",
  end: "endVerticalPosition",
  reference: "verticalReference",
  system: "verticalReferenceSystem",
};

const LONGITUDE_PATH = /^location\.position\.\w*longitude$/i;
const LATITUDE_PATH = /^location\.position\.\w*latitude$/i;

const HIERARCHY_PATHS = {
  type: "typePath",
  material: "materialPath",
  collectionMethod: "collectionMethodPath",
} as const;

type DraftContext = {
  typePath: (string | undefined)[];
  materialPath: (string | undefined)[];
  collectionMethodPath: (string | undefined)[];
};

const draftFieldName = (path: string, draft: DraftContext): string => {
  if (path.startsWith(VERTICAL_PREFIX)) {
    const leaf = path.slice(VERTICAL_PREFIX.length);
    return `location.${VERTICAL_FIELDS[leaf] ?? leaf}`;
  }
  if (path.startsWith("location.position."))
    return `location.${path.slice("location.position.".length)}`;
  if (path === "location.region.kind") return "location.regionKind";
  if (path.startsWith("location.region."))
    return `location.${path.slice("location.region.".length)}`;
  if (path === "location") return "location.type";
  const range = DATE_RANGE_PATH.exec(path);
  if (range) return `${range[1]}${DATE_RANGE_SUFFIXES[range[2] ?? "start"]}`;
  const measurement = MEASUREMENT_PATH.exec(path) ?? READING_PATH.exec(path);
  if (measurement)
    return `${measurement[1]}.${measurement[2]}${
      measurement[3] === "value" ? "Value" : "Unit"
    }`;
  if (path === "condition.temperature.type") return "condition.temperatureType";
  if (path === "condition.pressure.type") return "condition.pressureType";
  if (path === "condition.humidity.type") return "condition.humidityType";
  if (path === "condition.humidity.percentage")
    return "condition.humidityPercentage";
  const hierarchy = HIERARCHY_PATHS[path as keyof typeof HIERARCHY_PATHS];
  if (hierarchy)
    return `${hierarchy}[${draft[hierarchy].filter(Boolean).length}]`;
  const relation = RELATION_PATH.exec(path);
  if (relation) return `relations[${relation[1]}].${relation[2]}`;
  return path;
};

const ORDER_END_FIELDS: Record<string, string | undefined> = {
  collection_date_order: "description.collectionDateEnd",
  synthesis_date_order: "syntheticDetails.synthesisDateEnd",
};

const REASON_MESSAGES: Record<string, (() => string) | undefined> = {
  collection_date_future: m.field_collection_date_future,
  collection_date_order: m.field_collection_date_order,
  synthesis_date_future: m.field_synthesis_date_future,
  synthesis_date_order: m.field_synthesis_date_order,
  humidity_percentage_range: m.field_humidity_percentage_range,
};

type DraftIssue = {
  path: ReadonlyArray<PropertyKey>;
  code?: string;
  params?: unknown;
};

function issueMessage(path: string, issue: DraftIssue): string {
  const reason = (issue.params as { code?: string } | undefined)?.code;
  const blocker = publishBlockerSchema.safeParse(reason);
  if (blocker.success) {
    return publishBlockerLabel(blocker.data);
  }
  const reasonMessage = reason == null ? undefined : REASON_MESSAGES[reason];
  if (reasonMessage) {
    return reasonMessage();
  }
  if (reason === "relation_identifier_doi") {
    return m.field_relation_identifier_doi();
  }
  if (reason === "relation_identifier_igsn") {
    return m.field_relation_identifier_igsn();
  }
  if (reason === "relation_identifier_url") {
    return m.field_relation_identifier_url();
  }
  if (reason === "relation_scheme_without_has_metadata") {
    return m.field_relation_scheme_without_has_metadata();
  }
  if (
    RELATION_PATH.test(path) &&
    RELATION_REQUIRED_CODES.includes(issue.code ?? "")
  ) {
    return m.field_relation_required();
  }
  if (issue.code === "too_small" && path.startsWith(VERTICAL_PREFIX)) {
    return m.field_vertical_position_negative();
  }
  if (issue.code === "too_big" || issue.code === "too_small") {
    if (LONGITUDE_PATH.test(path)) return m.field_longitude_range();
    if (LATITUDE_PATH.test(path)) return m.field_latitude_range();
  }
  if (path === "condition.humidity.percentage") {
    return m.field_humidity_percentage_bounds();
  }
  const measurement = MEASUREMENT_PATH.exec(path) ?? READING_PATH.exec(path);
  if (measurement) {
    if (measurement[3] === "unit") return m.field_measurement_unit_required();
    return issue.code === "too_small"
      ? m.field_measurement_positive()
      : m.field_measurement_value_required();
  }
  return m.field_invalid();
}

export function sampleDraftFieldErrors(
  issues: ReadonlyArray<DraftIssue>,
  draft: DraftContext,
): Record<string, { message: string }> {
  const fields: Record<string, { message: string }> = {};
  for (const issue of issues) {
    const path = issue.path.join(".");
    const message = issueMessage(path, issue);
    fields[draftFieldName(path, draft)] ??= { message };
    const reason = (issue.params as { code?: string } | undefined)?.code;
    const endField = reason && ORDER_END_FIELDS[reason];
    if (endField) fields[endField] ??= { message };
  }
  return fields;
}
