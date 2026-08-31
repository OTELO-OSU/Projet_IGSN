import { z } from "zod";

import { LABORATORIES, laboratoryCodeSchema } from "./laboratory.ts";
import { ORGANIZATIONS, organizationRorSchema } from "./organization.ts";
import { OSUS, osuCodeSchema } from "./osu.ts";

// ponytail: three flat fields spread into userSchema and sampleSchema, no nested object, so neither table needs json building; defaulted null so payloads predating the feature keep parsing
export const institutionalGroupsFields = {
  institutionalOrganization: organizationRorSchema.nullable().default(null),
  institutionalOsu: osuCodeSchema.nullable().default(null),
  institutionalLaboratory: laboratoryCodeSchema.nullable().default(null),
};

export const institutionalGroupsSchema = z.object(institutionalGroupsFields);

export type InstitutionalGroups = z.infer<typeof institutionalGroupsSchema>;

export const institutionalGroupKindSchema = z.enum([
  "organization",
  "osu",
  "laboratory",
]);

export type InstitutionalGroupKind = z.infer<
  typeof institutionalGroupKindSchema
>;

const CODES_BY_KIND: Record<InstitutionalGroupKind, Set<string>> = {
  organization: new Set(ORGANIZATIONS.map(({ ror }) => ror)),
  osu: new Set(OSUS.map(({ code }) => code)),
  laboratory: new Set(LABORATORIES.map(({ code }) => code)),
};

export function isKnownInstitutionalCode(
  kind: InstitutionalGroupKind,
  code: string,
): boolean {
  return CODES_BY_KIND[kind].has(code);
}

export const institutionalGroupRefSchema = z
  .object({ kind: institutionalGroupKindSchema, code: z.string() })
  .refine(({ kind, code }) => isKnownInstitutionalCode(kind, code), {
    path: ["code"],
    error: "unknown institutional group code",
  });

export type InstitutionalGroupRef = z.infer<typeof institutionalGroupRefSchema>;
