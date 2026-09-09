import type { ManagedGroups } from "../user/managed-groups.ts";
import type { RequestableInstitutionalGroups } from "./service-account-validator.ts";

import { filterOsusByOrg } from "../institutional-group/filter-osus-by-org.ts";
import { managedLaboratoryCodes } from "../user/managed-laboratory-codes.ts";

const uniqueSorted = (codes: string[]) => [...new Set(codes)].sort();

export function requestableInstitutionalGroups(
  ownLaboratory: string | null,
  managed: ManagedGroups,
): RequestableInstitutionalGroups {
  return {
    organizations: uniqueSorted(managed.organizations),
    osus: uniqueSorted([
      ...managed.osus,
      ...managed.organizations.flatMap((organizationRor) =>
        filterOsusByOrg(organizationRor).map(({ code }) => code),
      ),
    ]),
    laboratories: uniqueSorted([
      ...(ownLaboratory === null ? [] : [ownLaboratory]),
      ...managedLaboratoryCodes(managed),
    ]),
  };
}
