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

export type ComboboxItem = { value: string; label: string };

type ComboboxProps = {
  items: ComboboxItem[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
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
          onBlur={onBlur}
          className="w-full justify-between font-normal"
          {...aria}
        >
          {selected ? selected.label : placeholder}
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
                  // Values are machine codes; match the visible label too so
                  // typing part of it finds the item.
                  keywords={[item.label]}
                  // Re-selecting the current item clears it (empty value).
                  onSelect={() => {
                    onChange(item.value === value ? "" : item.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
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
