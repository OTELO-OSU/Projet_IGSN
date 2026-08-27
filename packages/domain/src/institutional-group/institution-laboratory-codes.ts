import type { Laboratory } from "./laboratory.ts";

import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { parseInstitutionFilter } from "./institution-filter.ts";
import { LABORATORIES } from "./laboratory.ts";

export function institutionLaboratories(filter: string): Laboratory[] {
  const parsed = parseInstitutionFilter(filter);
  if (parsed === null) return [];
  if (parsed.kind === "laboratory") {
    const laboratory = LABORATORIES.find(({ code }) => code === parsed.code);
    return laboratory ? [laboratory] : [];
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
