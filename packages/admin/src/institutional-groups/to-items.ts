import { filterOrganizationsWithLaboratory } from "@projet-igsn/domain/institutional-group/filter-organizations-with-laboratory";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";

export const toItems = (
  entries: readonly { code: string }[],
  label: (code: string) => string,
) => entries.map(({ code }) => ({ value: code, label: label(code) }));

export const ORGANIZATION_ITEMS = filterOrganizationsWithLaboratory().map(
  ({ ror }) => ({ value: ror, label: organizationLabel(ror) }),
);

export const ALL_ORGANIZATION_ITEMS = ORGANIZATIONS.map(({ ror }) => ({
  value: ror,
  label: organizationLabel(ror),
}));
