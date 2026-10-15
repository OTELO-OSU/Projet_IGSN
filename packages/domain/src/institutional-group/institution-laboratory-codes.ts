import type { Laboratory } from "./laboratory.ts";

import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { parseInstitutionFilter } from "./institution-filter.ts";
import { laboratoryCodesWithPredecessors } from "./laboratory-codes-with-predecessors.ts";
import { LABORATORIES } from "./laboratory.ts";

export function institutionLaboratories(filter: string): Laboratory[] {
  const parsed = parseInstitutionFilter(filter);
  if (parsed === null) return [];
  if (parsed.kind === "laboratory") {
    const codes = laboratoryCodesWithPredecessors(parsed.code);
    return LABORATORIES.filter(({ code }) => codes.includes(code));
  }

  return filterLaboratoriesByOrgAndOsu(
    parsed.kind === "organization"
      ? { organizationRor: parsed.code }
      : { organizationRor: parsed.organizationRor, osu: parsed.code },
  );
}

export function institutionLaboratoryCodes(filter: string): string[] {
  return institutionLaboratories(filter).map(({ code }) => code);
}
