import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

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

import { m } from "#/paraglide/messages.js";
import { useSamplePicker } from "#/samples/use-sample-picker.ts";

export function SamplePicker({
  id,
  value,
  onChange,
  placeholder,
  clearLabel,
  exclude,
}: {
  id: string;
  value: SampleParent | null;
  onChange: (value: SampleParent | null) => void;
  placeholder: string;
  clearLabel?: string;
  exclude?: string;
}) {
  const picker = useSamplePicker({ onChange, exclude });

  return (
    <Popover open={picker.isOpen} onOpenChange={picker.setIsOpen}>
      <ComboboxTrigger id={id} open={picker.isOpen}>
        {value ? (
          `${value.name} (${value.igsn})`
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </ComboboxTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] min-w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          shouldFilter={false}
          label={m.second_parent_search_placeholder()}
        >
          <CommandInput
            placeholder={m.second_parent_search_placeholder()}
            value={picker.term}
            onValueChange={picker.setTerm}
          />
          <CommandList label={m.second_parent_suggestions_label()}>
            {picker.hasNoResults ? (
              <div className="py-6 text-center text-sm">
                {m.second_parent_empty()}
              </div>
            ) : null}
            {clearLabel === undefined ? null : (
              <CommandItem value="any" onSelect={() => picker.pick(null)}>
                {clearLabel}
              </CommandItem>
            )}
            {picker.samples.map((sample) => (
              <CommandItem
                key={sample.id}
                value={sample.id}
                onSelect={() => picker.pick(sample)}
              >
                <span className="truncate">{sample.name}</span>
                <span className="text-muted-foreground truncate">
                  {sample.igsn}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
