import { ORGANIZATIONS } from "./organization.ts";

// ROR id -> display label. Names/acronyms are reference data (proper nouns, not
// i18n), so the label comes from ORGANIZATIONS itself. Shared by any surface
// that shows a funder/research-structure organization to a reader.
const labelByRor = new Map(
  ORGANIZATIONS.map((organization) => [
    organization.ror,
    organization.acronym
      ? `${organization.name} (${organization.acronym})`
      : organization.name,
  ]),
);

// Falls back to the raw ROR for an id not in the list, so an unknown value
// still shows something stable rather than nothing.
export function organizationLabel(ror: string): string {
  return labelByRor.get(ror) ?? ror;
}
