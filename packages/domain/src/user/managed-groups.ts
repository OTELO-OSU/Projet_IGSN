import { z } from "zod";

import type { InstitutionalGroupKind } from "../institutional-group/model.ts";

import { laboratoryCodeOf } from "../institutional-group/laboratory-code-of.ts";
import { laboratoryIdOf } from "../institutional-group/laboratory-id-of.ts";
import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { isKnownInstitutionalCode } from "../institutional-group/model.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeOf } from "../institutional-group/osu-code-of.ts";
import { osuIdOf } from "../institutional-group/osu-id-of.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";

const isKnown = (kind: InstitutionalGroupKind) => (code: string) =>
  isKnownInstitutionalCode(kind, code);

const CURRENT_CODE_OF: Record<
  InstitutionalGroupKind,
  (code: string) => string
> = {
  organization: (ror) => ror,
  osu: (code) => osuCodeOf(osuIdOf(code)),
  laboratory: (code) => laboratoryCodeOf(laboratoryIdOf(code)),
};

const knownCodes = (
  code: z.ZodType<string>,
  kind: InstitutionalGroupKind,
  message: string,
) =>
  z
    .array(code.refine(isKnown(kind), message))
    .transform((codes) => [...new Set(codes.map(CURRENT_CODE_OF[kind]))]);

export const managedGroupsSchema = z.strictObject({
  organizations: knownCodes(
    organizationRorSchema,
    "organization",
    "unknown organization",
  ),
  osus: knownCodes(osuCodeSchema, "osu", "unknown OSU"),
  laboratories: knownCodes(
    laboratoryCodeSchema,
    "laboratory",
    "unknown laboratory",
  ),
  manualGroupIds: z.array(z.uuid()).transform((ids) => [...new Set(ids)]),
});

export type ManagedGroups = z.infer<typeof managedGroupsSchema>;

export const NO_MANAGED_GROUPS: ManagedGroups = {
  organizations: [],
  osus: [],
  laboratories: [],
  manualGroupIds: [],
};

export const MANAGED_GROUP_KINDS = [
  ["organizations", "organization"],
  ["osus", "osu"],
  ["laboratories", "laboratory"],
] as const;

export function knownManagedCodes(stored: ManagedGroups): ManagedGroups {
  return {
    ...stored,
    organizations: stored.organizations.filter(isKnown("organization")),
    osus: stored.osus.filter(isKnown("osu")),
    laboratories: stored.laboratories.filter(isKnown("laboratory")),
  };
}
