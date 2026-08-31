import { z } from "zod";

import type { InstitutionalGroupKind } from "../institutional-group/model.ts";

import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { isKnownInstitutionalCode } from "../institutional-group/model.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";

const isKnown = (kind: InstitutionalGroupKind) => (code: string) =>
  isKnownInstitutionalCode(kind, code);

const knownCodes = (
  code: z.ZodType<string>,
  kind: InstitutionalGroupKind,
  message: string,
) =>
  z
    .array(code.refine(isKnown(kind), message))
    .transform((codes) => [...new Set(codes)]);

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
