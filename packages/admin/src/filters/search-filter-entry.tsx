import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";

import type { FilterEntry } from "#/filters/list-header.tsx";

export function searchFilterEntry({
  label,
  placeholder,
  defaultValue,
  onSearch,
  className,
}: {
  label: string;
  placeholder: string;
  defaultValue: string | undefined;
  onSearch: (value: string) => void;
  className?: string;
}): FilterEntry {
  return {
    name: "search",
    label,
    className,
    cell: (
      <SearchField
        defaultValue={defaultValue}
        label={label}
        placeholder={placeholder}
        onSearch={onSearch}
      />
    ),
  };
}
