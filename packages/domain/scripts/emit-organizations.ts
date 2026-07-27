// The one definition of src/sample/scientific-context/organization.ts, shared by
// generate-organizations.ts (CSV import) and sync-organizations.ts (ROR refresh),
// so neither script can drift from the other. Rows come out one per line; the
// callers run `pnpm fmt:apply` on the target, which reflows them, so re-emitting
// an unchanged row is byte-identical to what is checked in.
import type { Organization } from "../src/sample/scientific-context/organization.ts";

export function emitOrganizations(
  organizations: readonly Organization[],
): string {
  const rows = organizations
    .map(
      (o) =>
        `  { ror: ${JSON.stringify(o.ror)}, name: ${JSON.stringify(o.name)}, acronym: ${JSON.stringify(o.acronym)} },`,
    )
    .join("\n");

  return `import { z } from "zod";

// Research organizations with their ROR identifier (Research Organization
// Registry), the internal reference list PY maintains. A sample's funder
// organization and the program chief's research structure both reference an
// organization by its ROR id; the id is the stable code, the name/acronym are
// display data (proper nouns, not translated, so not in the i18n catalog).
//
// Generated from a CSV export; do not edit by hand for bulk changes. Regenerate
// with: pnpm -F @projet-igsn/domain generate-organizations path/to/orgs.csv
// A one-off addition can be appended to ORGANIZATIONS directly (keep ROR ids
// unique). Promote to a DB table only if orgs must be editable at runtime.
export type Organization = {
  ror: string;
  name: string;
  acronym: string | null;
};

export const ORGANIZATIONS: readonly Organization[] = [
${rows}
];

// A ROR identifier: nine chars, a leading 0 then a base32 body and a two-digit
// checksum (https://ror.readme.io/docs/identifier). Validated by format, not by
// membership in ORGANIZATIONS, so the list can grow without rejecting values
// already stored.
export const organizationRorSchema = z
  .string()
  .regex(/^0[0-9a-hj-km-np-tv-z]{6}[0-9]{2}$/, "invalid ROR identifier");

export type OrganizationRor = z.infer<typeof organizationRorSchema>;
`;
}
