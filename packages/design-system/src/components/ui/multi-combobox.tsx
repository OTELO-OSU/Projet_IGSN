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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "./popover.tsx";

// ponytail: fixed cap, lift it to a prop if another caller needs one.
const UNSEARCHED_LIMIT = 10;

type MultiComboboxProps = {
  items: ComboboxItem[];
  values: string[];
  onChange: (values: string[]) => void;
  onBlur?: () => void;
  onSearch?: (term: string) => void;
  id?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  removeLabel: (label: string) => string;
  lockedValues?: string[];
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function MultiCombobox({
  items,
  values,
  onChange,
  onBlur,
  onSearch,
  id,
  placeholder,
  searchPlaceholder,
  emptyText,
  removeLabel,
  lockedValues,
  disabled,
  ...aria
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.filter((item) => values.includes(item.value));
  const query = search.trim().toLowerCase();
  const unselected = items.filter((item) => !values.includes(item.value));
  const visible = onSearch
    ? unselected
    : query
      ? unselected.filter((item) => item.label.toLowerCase().includes(query))
      : unselected.slice(0, UNSEARCHED_LIMIT);

  const toggle = (value: string) =>
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1",
            disabled && "opacity-50",
          )}
        >
          {selected.map((item) => {
            const locked = lockedValues?.includes(item.value);
            return (
              <Badge
                key={item.value}
                variant="secondary"
                className={locked ? undefined : "gap-1 pr-1"}
              >
                {item.label}
                {locked ? null : (
                  <button
                    type="button"
                    aria-label={removeLabel(item.label)}
                    disabled={disabled}
                    onClick={() => toggle(item.value)}
                    className="hover:bg-foreground/10 rounded-full disabled:pointer-events-none"
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </Badge>
            );
          })}
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
              {selected.length === 0 ? placeholder : null}
              <ChevronsUpDownIcon className="opacity-50" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              onSearch?.(value);
            }}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {visible.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
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
  );
}
