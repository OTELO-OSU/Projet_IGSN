import { publishBlockerSchema } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";

const MEASUREMENT_PATH =
  /^description\.(length|width|thickness|mass|volume)\.(value|unit)$/;

const READING_PATH =
  /^condition\.(temperature|pressure)\.measurement\.(value|unit)$/;

const LINK_PATH = /^links\.(\d+)\.(url|description)$/;

// The generic wording names no range, so an out-of-range coordinate says which
// axis and which bounds.
const LONGITUDE_PATH = /^location\.position\.\w*longitude$/i;
const LATITUDE_PATH = /^location\.position\.\w*latitude$/i;

// Every HierarchySelectField in the form needs an entry here: the widget
// registers one field per level (`name[depth]`), never the bare name, so an
// issue on the domain value pins on the next level to refine (the combobox
// after the deepest pick, the one the user must act on) or it would render
// nowhere. That level is the number of picks, not of slots: clearing a level
// leaves an `undefined` slot in place (see combobox-field.tsx).
const HIERARCHY_PATHS = {
  type: "typePath",
  material: "materialPath",
  collectionMethod: "collectionMethodPath",
} as const;

type DraftContext = {
  typePath: (string | undefined)[];
  materialPath: (string | undefined)[];
  collectionMethodPath: (string | undefined)[];
  location: Pick<LocationDraft, "type">;
};

// Elevation min/max both come from the single value input when the geometry is
// a point (degenerate range); the collection date always maps to its range
// bounds (in single mode the visible input is the start field, mirrored into
// the end).
const draftFieldName = (path: string, draft: DraftContext): string => {
  const locationType = draft.location.type;
  if (path.startsWith("location.position.elevation.min"))
    return locationType === "point"
      ? "location.elevationValue"
      : "location.elevationMin";
  if (path.startsWith("location.position.elevation.max"))
    return locationType === "point"
      ? "location.elevationValue"
      : "location.elevationMax";
  if (path === "location.position.elevation.unit")
    return "location.elevationUnit";
  if (path === "location.position.elevation.datum")
    return "location.elevationDatum";
  if (path.startsWith("location.position."))
    return `location.${path.slice("location.position.".length)}`;
  if (path === "location.region.kind") return "location.regionKind";
  if (path.startsWith("location.region."))
    return `location.${path.slice("location.region.".length)}`;
  // Publish-blocker container paths pin on the field the user can act on.
  if (path === "location") return "location.type";
  if (path === "description.collectionDate")
    return "description.collectionDateStart";
  if (path.startsWith("description.collectionDate."))
    return path === "description.collectionDate.start"
      ? "description.collectionDateStart"
      : "description.collectionDateEnd";
  const measurement = MEASUREMENT_PATH.exec(path);
  if (measurement)
    return `description.${measurement[1]}${
      measurement[2] === "value" ? "Value" : "Unit"
    }`;
  const reading = READING_PATH.exec(path);
  if (reading)
    return `condition.${reading[1]}${
      reading[2] === "value" ? "Value" : "Unit"
    }`;
  if (path === "condition.temperature.type") return "condition.temperatureType";
  if (path === "condition.pressure.type") return "condition.pressureType";
  if (path === "condition.humidity.type") return "condition.humidityType";
  if (path === "condition.humidity.percentage")
    return "condition.humidityPercentage";
  const hierarchy = HIERARCHY_PATHS[path as keyof typeof HIERARCHY_PATHS];
  if (hierarchy)
    return `${hierarchy}[${draft[hierarchy].filter(Boolean).length}]`;
  const link = LINK_PATH.exec(path);
  if (link) return `links[${link[1]}].${link[2]}`;
  return path;
};

type DraftIssue = {
  path: ReadonlyArray<PropertyKey>;
  code?: string;
  params?: unknown;
};

// Domain custom issues carry a machine code in params (see descriptionSchema).
function issueMessage(path: string, issue: DraftIssue): string {
  const reason = (issue.params as { code?: string } | undefined)?.code;
  const blocker = publishBlockerSchema.safeParse(reason);
  if (blocker.success) {
    return publishBlockerLabel(blocker.data);
  }
  if (reason === "collection_date_future") {
    return m.field_collection_date_future();
  }
  if (reason === "collection_date_order") {
    return m.field_collection_date_order();
  }
  if (reason === "humidity_percentage_range") {
    return m.field_humidity_percentage_range();
  }
  if (issue.code === "too_big" || issue.code === "too_small") {
    if (LONGITUDE_PATH.test(path)) return m.field_longitude_range();
    if (LATITUDE_PATH.test(path)) return m.field_latitude_range();
  }
  if (path === "condition.humidity.percentage") {
    // Outside the range refinement, only the 0-100 bounds remain.
    return m.field_humidity_percentage_bounds();
  }
  const measurement = MEASUREMENT_PATH.exec(path) ?? READING_PATH.exec(path);
  if (measurement) {
    if (measurement[2] === "unit") return m.field_measurement_unit_required();
    return issue.code === "too_small"
      ? m.field_measurement_positive()
      : m.field_measurement_value_required();
  }
  // Whatever the url fails on (blank, non-DOI), the fix is the same: a DOI.
  if (LINK_PATH.exec(path)?.[2] === "url") return m.field_doi_url_invalid();
  return m.field_invalid();
}

// Fields with a dedicated live validator (name, elevation integer...) show
// their specific message first.
export function sampleDraftFieldErrors(
  issues: ReadonlyArray<DraftIssue>,
  draft: DraftContext,
): Record<string, { message: string }> {
  const fields: Record<string, { message: string }> = {};
  for (const issue of issues) {
    const path = issue.path.join(".");
    const message = issueMessage(path, issue);
    fields[draftFieldName(path, draft)] ??= { message };
    // The range order concerns the pair, so the error reads on both bounds
    // (the domain pins it on start only).
    if (
      (issue.params as { code?: string } | undefined)?.code ===
      "collection_date_order"
    ) {
      fields["description.collectionDateEnd"] ??= { message };
    }
  }
  return fields;
}
