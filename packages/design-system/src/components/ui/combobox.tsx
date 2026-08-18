import type { ReactNode } from "react";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils.ts";
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

export type ComboboxItem = {
  value: string;
  label: string;
  display?: ReactNode;
};

export const toComboboxItems = <Value extends string>(
  values: readonly Value[],
  label: (value: Value) => string,
): ComboboxItem[] => values.map((value) => ({ value, label: label(value) }));

type ComboboxProps = {
  items: ComboboxItem[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  clearable?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function Combobox({
  items,
  value,
  onChange,
  onBlur,
  id,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  clearable = true,
  ...aria
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onBlur={onBlur}
          className="w-full justify-between font-normal"
          {...aria}
        >
          <span className="truncate">
            {selected ? (selected.display ?? selected.label) : placeholder}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  keywords={[item.label]}
                  onSelect={() => {
                    onChange(
                      clearable && item.value === value ? "" : item.value,
                    );
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.display ?? item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
