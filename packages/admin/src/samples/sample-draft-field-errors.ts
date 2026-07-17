import { publishBlockerSchema } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";

// Measurement leaves (description.length.value...) map back to the flat
// value/unit draft fields (description.lengthValue...).
const MEASUREMENT_PATH =
  /^description\.(length|width|thickness|mass|volume)\.(value|unit)$/;

// Condition readings nest value/unit under their category
// (condition.temperature.measurement.value -> condition.temperatureValue).
const READING_PATH =
  /^condition\.(temperature|pressure)\.measurement\.(value|unit)$/;

// Maps a domain-schema issue path (composed CreateSample shape) back to the
// flat draft field that produced the value. Elevation min/max both come from
// the single value input when the geometry is a point (degenerate range); the
// collection date always maps to its range bounds (in single mode the visible
// input is the start field, mirrored into the end).
const draftFieldName = (
  path: string,
  locationType: LocationDraft["type"],
): string => {
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
  if (path === "type") return "typePath";
  if (path === "material") return "materialPath";
  if (path === "collectionMethod") return "collectionMethodPath";
  return path;
};

type DraftIssue = {
  path: ReadonlyArray<PropertyKey>;
  code?: string;
  params?: unknown;
};

// Translates a schema issue into readable copy: domain custom issues carry a
// machine code in params (see descriptionSchema), measurement issues resolve
// from their path and zod code, anything else falls back to a generic message.
function issueMessage(path: string, issue: DraftIssue): string {
  const reason = (issue.params as { code?: string } | undefined)?.code;
  // A publish-blocker issue (publishedSampleSchema) reuses the tooltip
  // translations, so the field explains itself the same way the button does.
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
  return m.field_invalid();
}

// Turns domain-schema issues into the `fields` error map a TanStack form-level
// validator returns, pinning each error on its input, translated by
// issueMessage. Fields with a dedicated live validator (name, elevation
// integer...) show their specific message first.
export function sampleDraftFieldErrors(
  issues: ReadonlyArray<DraftIssue>,
  locationType: LocationDraft["type"],
): Record<string, { message: string }> {
  const fields: Record<string, { message: string }> = {};
  for (const issue of issues) {
    const path = issue.path.join(".");
    const message = issueMessage(path, issue);
    fields[draftFieldName(path, locationType)] ??= { message };
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
