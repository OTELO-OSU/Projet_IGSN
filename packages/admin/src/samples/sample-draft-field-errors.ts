import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";

// Maps a domain-schema issue path (composed CreateSample shape) back to the
// flat draft field that produced the value. Elevation min/max both come from
// the single value input when the geometry is a point (degenerate range).
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
