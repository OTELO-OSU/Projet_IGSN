import { z } from "zod";

import {
  LABORATORIES,
  laboratoryCodeSchema,
} from "../institutional-group/laboratory.ts";
import {
  ORGANIZATIONS,
  organizationRorSchema,
} from "../institutional-group/organization.ts";
import { OSUS, osuCodeSchema } from "../institutional-group/osu.ts";

const CATALOG = {
  organizations: new Set(ORGANIZATIONS.map(({ ror }) => ror)),
  osus: new Set(OSUS.map(({ code }) => code)),
  laboratories: new Set(LABORATORIES.map(({ code }) => code)),
};

type ManagedKind = keyof typeof CATALOG;

const isKnown = (kind: ManagedKind) => (code: string) =>
  CATALOG[kind].has(code);

const knownCodes = (
  code: z.ZodType<string>,
  kind: ManagedKind,
  message: string,
) =>
  z
    .array(code.refine(isKnown(kind), message))
    .transform((codes) => [...new Set(codes)]);

export const managedGroupsSchema = z.strictObject({
  organizations: knownCodes(
    organizationRorSchema,
    "organizations",
    "unknown organization",
  ),
  osus: knownCodes(osuCodeSchema, "osus", "unknown OSU"),
  laboratories: knownCodes(
    laboratoryCodeSchema,
    "laboratories",
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
    organizations: stored.organizations.filter(isKnown("organizations")),
    osus: stored.osus.filter(isKnown("osus")),
    laboratories: stored.laboratories.filter(isKnown("laboratories")),
  };
}
