import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { filterOrganizationsWithLaboratory } from "./filter-organizations-with-laboratory.ts";

export type InstitutionTreeOrganization = {
  ror: string;
  osus: { code: string | null; laboratories: string[] }[];
};

export function buildInstitutionTree(): InstitutionTreeOrganization[] {
  return filterOrganizationsWithLaboratory().map(({ ror }) => {
    const laboratories = filterLaboratoriesByOrgAndOsu({
      organizationRor: ror,
    });
    const codes = new Set<string | null>(laboratories.map(({ osu }) => osu));

    return {
      ror,
      osus: [...codes]
        .sort((a, b) => Number(a === null) - Number(b === null))
        .map((code) => ({
          code,
          laboratories: laboratories
            .filter((laboratory) => laboratory.osu === code)
            .map((laboratory) => laboratory.code),
        })),
    };
  });
}
