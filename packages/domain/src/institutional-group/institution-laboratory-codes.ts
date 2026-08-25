import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { parseInstitutionFilter } from "./institution-filter.ts";

export function institutionLaboratoryCodes(filter: string): string[] {
  const parsed = parseInstitutionFilter(filter);
  if (parsed === null) return [];
  if (parsed.kind === "laboratory") return [parsed.code];

  return filterLaboratoriesByOrgAndOsu(
    parsed.kind === "organization"
      ? { organizationRor: parsed.code }
      : { organizationRor: parsed.organizationRor, osu: parsed.code },
  ).map(({ code }) => code);
}
