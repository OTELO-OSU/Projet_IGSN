import type { ComboboxItem } from "@projet-igsn/design-system/components/ui/combobox";

export function withCounts(
  items: ComboboxItem[],
  counts: Record<string, number> | undefined,
  selected: string | undefined,
): ComboboxItem[] {
  if (!counts) return items;
  return items.flatMap((item) => {
    const count = counts[item.value] ?? 0;
    if (count > 0) return [{ ...item, count }];
    return item.value === selected ? [item] : [];
  });
}

export function withSelected(
  items: { value: string; label: string }[],
  selected: string | undefined,
  label: (code: string) => string,
): { value: string; label: string }[] {
  return selected && !items.some((item) => item.value === selected)
    ? [...items, { value: selected, label: label(selected) }]
    : items;
}
