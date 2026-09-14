import type { ComboboxItem } from "@projet-igsn/design-system/components/ui/combobox";

export const comboboxItemFormat =
  (items: ComboboxItem[]) =>
  (value: unknown): string =>
    (Array.isArray(value) ? value : [value])
      .map(
        (entry) =>
          items.find((item) => item.value === entry)?.label ?? String(entry),
      )
      .join(", ");
