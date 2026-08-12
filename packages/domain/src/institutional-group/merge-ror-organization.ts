import { z } from "zod";

import { type Organization } from "./organization.ts";

// The slice of a ROR v2 organization record the sync reads
// (https://ror.readme.io/v2/docs/data-structure).
export const rorRecordSchema = z.object({
  names: z.array(z.object({ value: z.string(), types: z.array(z.string()) })),
});

type RorRecord = z.infer<typeof rorRecordSchema>;

function valuesOfType(record: RorRecord, type: string): string[] {
  return record.names
    .filter((name) => name.types.includes(type) && name.value !== "")
    .map((name) => name.value);
}

export function mergeRorOrganization(
  current: Organization,
  record: RorRecord,
): Organization {
  return {
    ror: current.ror,
    name: valuesOfType(record, "ror_display")[0] ?? current.name,
    acronym: valuesOfType(record, "acronym")[0] ?? current.acronym,
  };
}
