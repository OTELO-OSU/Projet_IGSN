import type { Organization } from "../src/institutional-group/organization.ts";

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

// Generated from a CSV export; do not edit by hand for bulk changes. Refresh
// with: node packages/domain/scripts/sync-organizations.ts
export type Organization = {
  ror: string;
  name: string;
  acronym: string | null;
};

export const ORGANIZATIONS: readonly Organization[] = [
${rows}
];

// A ROR identifier: nine chars, a leading 0 then a base32 body and a two-digit
// checksum (https://ror.readme.io/docs/identifier).
export const organizationRorSchema = z
  .string()
  .regex(/^0[0-9a-hj-km-np-tv-z]{6}[0-9]{2}$/, "invalid ROR identifier");

export type OrganizationRor = z.infer<typeof organizationRorSchema>;
`;
}
