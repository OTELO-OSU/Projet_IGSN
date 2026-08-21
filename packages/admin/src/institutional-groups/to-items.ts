import { filterOrganizationsWithLaboratory } from "@projet-igsn/domain/institutional-group/filter-organizations-with-laboratory";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";

export const toItems = (
  entries: readonly { code: string }[],
  label: (code: string) => string,
) => entries.map(({ code }) => ({ value: code, label: label(code) }));

export const ORGANIZATION_ITEMS = filterOrganizationsWithLaboratory().map(
  ({ ror }) => ({ value: ror, label: organizationLabel(ror) }),
);
