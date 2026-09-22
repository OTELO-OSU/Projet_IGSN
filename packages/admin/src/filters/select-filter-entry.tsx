import type { FilterEntry } from "#/filters/list-header.tsx";

import { SelectFilter } from "#/filters/select-filter.tsx";

export function selectFilterEntry<Value extends string>({
  name,
  label,
  anyLabel,
  items,
  value,
  parse,
  onChange,
}: {
  name: string;
  label: string;
  anyLabel: string;
  items: { value: string; label: string }[];
  value: Value | undefined;
  parse: (value: unknown) => Value | undefined;
  onChange: (value: Value | undefined) => void;
}): FilterEntry {
  return {
    name,
    label,
    active: value !== undefined,
    onRemove: () => onChange(undefined),
    cell: (
      <SelectFilter
        id={`${name}-filter`}
        label={label}
        anyLabel={anyLabel}
        items={items}
        value={value}
        onChange={(next) => onChange(parse(next))}
      />
    ),
  };
}
