import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";

// Measurement leaves (description.length.value...) map back to the flat
// value/unit draft fields (description.lengthValue...).
const MEASUREMENT_PATH =
  /^description\.(length|width|thickness|mass|volume)\.(value|unit)$/;

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
  if (path.startsWith("description.collectionDate."))
    return path === "description.collectionDate.start"
      ? "description.collectionDateStart"
      : "description.collectionDateEnd";
  const measurement = MEASUREMENT_PATH.exec(path);
  if (measurement)
    return `description.${measurement[1]}${
      measurement[2] === "value" ? "Value" : "Unit"
    }`;
  if (path === "type") return "typePath";
  if (path === "material") return "materialPath";
  if (path === "collectionMethod") return "collectionMethodPath";
  return path;
};

// Turns domain-schema issues into the `fields` error map a TanStack form-level
// validator returns, pinning each error on its input. The message is a generic
// translated fallback; fields with a dedicated live validator (name, elevation
// integer...) show their specific message first.
export function sampleDraftFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>,
  locationType: LocationDraft["type"],
): Record<string, { message: string }> {
  const fields: Record<string, { message: string }> = {};
  for (const issue of issues) {
    const field = draftFieldName(issue.path.join("."), locationType);
    fields[field] ??= { message: m.field_invalid() };
  }
  return fields;
}
