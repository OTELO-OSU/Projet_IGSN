import { LABORATORIES } from "./laboratory.ts";
import { type Organization, ORGANIZATIONS } from "./organization.ts";

const RORS_WITH_LABORATORY = new Set(
  LABORATORIES.flatMap((laboratory) => laboratory.organizationRors),
);

export function filterOrganizationsWithLaboratory(): Organization[] {
  return ORGANIZATIONS.filter((organization) =>
    RORS_WITH_LABORATORY.has(organization.ror),
  );
}
