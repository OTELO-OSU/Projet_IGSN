import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";

import { useManualGroup } from "#/manual-groups/use-manual-group.ts";
import { useManualGroups } from "#/manual-groups/use-manual-groups.ts";
import { m } from "#/paraglide/messages.js";

// ponytail: one page of 50 groups, server-side search once the catalog outgrows it
const CATALOG_PAGE = { page: 1, perPage: 50, search: "" };

export function SampleManualGroupFilter({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const groups = useManualGroups(CATALOG_PAGE);
  const items = (groups.data?.data ?? []).map((group) => ({
    value: group.id,
    label: group.name,
  }));
  const isOffPage =
    groups.isSuccess &&
    value !== undefined &&
    !items.some((item) => item.value === value);
  const selected = useManualGroup(value ?? "", isOffPage);

  return (
    <Combobox
      id={id}
      items={
        selected.data
          ? [...items, { value: selected.data.id, label: selected.data.name }]
          : items
      }
      value={value ?? ""}
      onChange={(next) => onChange(next || undefined)}
      placeholder={m.filter_manual_group_any()}
      searchPlaceholder={m.manual_groups_search_placeholder()}
      emptyText={m.manual_groups_empty()}
    />
  );
}
