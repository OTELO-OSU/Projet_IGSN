import {
  laboratoryLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";

import {
  ORGANIZATION_ITEMS,
  toItems,
} from "#/institutional-groups/to-items.ts";

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
