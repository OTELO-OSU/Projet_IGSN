import { ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useState } from "react";

import type { ComboboxItem } from "./combobox.tsx";

import { cn } from "../../lib/utils.ts";
import { Badge } from "./badge.tsx";
import { Button } from "./button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";

// How many unselected options to show before the user narrows with a query.
// A flat list of ~100 (the elements) is unusable at once; typing filters the
// rest in. ponytail: fixed cap, lift it to a prop if another caller needs one.
const UNSEARCHED_LIMIT = 10;

type MultiComboboxProps = {
  items: ComboboxItem[];
  values: string[];
  onChange: (values: string[]) => void;
  onBlur?: () => void;
  id?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  // Accessible name for a chip's remove button (icon-only), per item label.
  removeLabel: (label: string) => string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

// A multi-select autocomplete: picked values render as removable chips, an
// autocomplete adds more. With no query only the first UNSEARCHED_LIMIT
// unselected options show; a query filters the full unselected set by label.
export function MultiCombobox({
  items,
  values,
  onChange,
  onBlur,
  id,
  placeholder,
  searchPlaceholder,
  emptyText,
  removeLabel,
  disabled,
  ...aria
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.filter((item) => values.includes(item.value));
  const query = search.trim().toLowerCase();
  const unselected = items.filter((item) => !values.includes(item.value));
  const visible = query
    ? unselected.filter((item) => item.label.toLowerCase().includes(query))
    : unselected.slice(0, UNSEARCHED_LIMIT);

  const toggle = (value: string) =>
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1",
        disabled && "opacity-50",
      )}
    >
      {selected.map((item) => (
        <Badge key={item.value} variant="secondary" className="gap-1 pr-1">
          {item.label}
          <button
            type="button"
            aria-label={removeLabel(item.label)}
            disabled={disabled}
            onClick={() => toggle(item.value)}
            className="rounded-full hover:bg-black/10 disabled:pointer-events-none"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            onBlur={onBlur}
            className="text-muted-foreground h-7 flex-1 justify-between px-1 font-normal hover:bg-transparent"
            {...aria}
          >
            {placeholder}
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          {/* Manual filtering: cmdk's own would defeat the unsearched cap. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {visible.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    keywords={[item.label]}
                    onSelect={() => toggle(item.value)}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
