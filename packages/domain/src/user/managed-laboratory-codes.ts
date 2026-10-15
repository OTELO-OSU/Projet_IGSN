import type { ManagedGroups } from "./managed-groups.ts";

import { filterLaboratoriesByOrgAndOsu } from "../institutional-group/filter-laboratories-by-org-and-osu.ts";
import { filterOsusByOrg } from "../institutional-group/filter-osus-by-org.ts";
import { laboratoryCodesWithPredecessors } from "../institutional-group/laboratory-codes-with-predecessors.ts";

const codesOf = (filter: { organizationRor?: string; osu?: string }) =>
  filterLaboratoriesByOrgAndOsu(filter).map((laboratory) => laboratory.code);

export function managedLaboratoryCodes(groups: ManagedGroups): string[] {
  const osus = [
    ...groups.osus,
    ...groups.organizations.flatMap((organizationRor) =>
      filterOsusByOrg(organizationRor).map(({ code }) => code),
    ),
  ];

  return [
    ...new Set([
      ...groups.organizations.flatMap((organizationRor) =>
        codesOf({ organizationRor }),
      ),
      ...osus.flatMap((osu) => codesOf({ osu })),
      ...groups.laboratories.flatMap((code) =>
        laboratoryCodesWithPredecessors(code),
      ),
    ]),
  ].sort();
}
