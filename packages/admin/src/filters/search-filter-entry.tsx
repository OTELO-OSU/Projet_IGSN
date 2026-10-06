import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";

import type { FilterEntry } from "#/filters/list-header.tsx";

export function searchFilterEntry({
  name = "search",
  label,
  isLabelVisible,
  placeholder,
  defaultValue,
  onRemove,
  onSearch,
}: {
  name?: string;
  label: string;
  isLabelVisible?: boolean;
  placeholder: string;
  defaultValue: string | undefined;
  onRemove?: () => void;
  onSearch: (value: string) => void;
}): FilterEntry {
  return {
    name,
    label,
    active: defaultValue !== undefined,
    onRemove,
    cell: (
      <SearchField
        defaultValue={defaultValue}
        label={label}
        isLabelVisible={isLabelVisible}
        placeholder={placeholder}
        onSearch={onSearch}
      />
    ),
  };
}
