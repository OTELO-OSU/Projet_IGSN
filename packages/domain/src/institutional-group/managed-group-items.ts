import { filterOrganizationsWithLaboratory } from "./filter-organizations-with-laboratory.ts";
import { laboratoryLabel, organizationLabel, osuLabel } from "./label.ts";
import { LABORATORIES } from "./laboratory.ts";
import { ORGANIZATIONS } from "./organization.ts";
import { OSUS } from "./osu.ts";

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

export const MANAGED_ORGANIZATION_ITEMS = ORGANIZATION_ITEMS.map((item) => ({
  ...item,
  label: `${item.label} (${item.value})`,
}));

export const MANAGED_OSU_ITEMS = toItems(OSUS, osuLabel);

export const MANAGED_LABORATORY_ITEMS = toItems(
  LABORATORIES,
  (code) => `${laboratoryLabel(code)} (${code})`,
);

export const withGranted = (
  items: readonly { value: string; label: string }[],
  granted: readonly string[],
) => {
  const offered = new Set(items.map((item) => item.value));
  return [
    ...granted
      .filter((value) => !offered.has(value))
      .map((value) => ({ value, label: value })),
    ...items,
  ];
};
