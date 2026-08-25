import { z } from "zod";

import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { LABORATORIES } from "./laboratory.ts";
import { ORGANIZATIONS } from "./organization.ts";

const institutionKindSchema = z.enum(["organization", "osu", "laboratory"]);

export type InstitutionKind = z.infer<typeof institutionKindSchema>;

export type InstitutionFilter =
  | { kind: "laboratory"; code: string }
  | { kind: "organization"; code: string }
  | { kind: "osu"; code: string; organizationRor: string };

const CODES_BY_KIND: Record<"organization" | "laboratory", Set<string>> = {
  organization: new Set(ORGANIZATIONS.map(({ ror }) => ror)),
  laboratory: new Set(LABORATORIES.map(({ code }) => code)),
};

function parseOsuFilter(value: string): InstitutionFilter | null {
  const separator = value.indexOf("/");
  if (separator === -1) return null;

  const organizationRor = value.slice(0, separator);
  const code = value.slice(separator + 1);
  return filterLaboratoriesByOrgAndOsu({ organizationRor, osu: code })
    .length === 0
    ? null
    : { kind: "osu", code, organizationRor };
}

export function parseInstitutionFilter(
  value: string,
): InstitutionFilter | null {
  const separator = value.indexOf(":");
  const kind = institutionKindSchema.safeParse(value.slice(0, separator));
  if (separator === -1 || !kind.success) return null;

  const code = value.slice(separator + 1);
  if (kind.data === "osu") return parseOsuFilter(code);

  return CODES_BY_KIND[kind.data].has(code) ? { kind: kind.data, code } : null;
}

export function formatInstitutionFilter(filter: InstitutionFilter): string {
  return filter.kind === "osu"
    ? `osu:${filter.organizationRor}/${filter.code}`
    : `${filter.kind}:${filter.code}`;
}

export const institutionFilterSchema = z
  .string()
  .refine((value) => parseInstitutionFilter(value) !== null);
