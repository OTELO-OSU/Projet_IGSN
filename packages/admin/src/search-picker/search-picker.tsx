import { ComboboxTrigger } from "@projet-igsn/design-system/components/ui/combobox";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@projet-igsn/design-system/components/ui/command";
import {
  Popover,
  PopoverContent,
} from "@projet-igsn/design-system/components/ui/popover";

import {
  MIN_SEARCH_LENGTH,
  type usePicker,
} from "#/search-picker/use-picker.ts";

export function SearchPicker<T extends { id: string }>({
  id,
  value,
  picker,
  found,
  onChange,
  labelOf,
  valueLabel = labelOf,
  detailOf,
  placeholder,
  searchPlaceholder,
  suggestionsLabel,
  emptyText,
  clearLabel,
  ...aria
}: {
  id: string;
  value: T | null;
  picker: ReturnType<typeof usePicker>;
  found: { data?: T[]; isFetching: boolean };
  onChange: (item: T | null) => void;
  labelOf: (item: T) => string;
  valueLabel?: (item: T) => string;
  detailOf: (item: T) => string;
  placeholder: string;
  searchPlaceholder: string;
  suggestionsLabel: string;
  emptyText: string;
  clearLabel?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}) {
  const items = found.data ?? [];
  const hasNoResults =
    picker.search.length >= MIN_SEARCH_LENGTH &&
    !found.isFetching &&
    items.length === 0;
  const pick = (item: T | null) => {
    onChange(item);
    picker.setIsOpen(false);
  };

  return (
    <Popover open={picker.isOpen} onOpenChange={picker.setIsOpen}>
      <ComboboxTrigger id={id} open={picker.isOpen} {...aria}>
        {value ? (
          valueLabel(value)
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </ComboboxTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] min-w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false} label={searchPlaceholder}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={picker.term}
            onValueChange={picker.setTerm}
          />
          <CommandList label={suggestionsLabel}>
            {hasNoResults ? (
              <div className="py-6 text-center text-sm">{emptyText}</div>
            ) : null}
            {clearLabel === undefined ? null : (
              <CommandItem value="any" onSelect={() => pick(null)}>
                {clearLabel}
              </CommandItem>
            )}
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => pick(item)}
              >
                <span className="truncate">{labelOf(item)}</span>
                <span className="text-muted-foreground truncate">
                  {detailOf(item)}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
