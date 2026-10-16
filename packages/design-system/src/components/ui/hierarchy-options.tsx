import { CheckIcon } from "lucide-react";

import { cn } from "../../lib/utils.ts";
import { CommandGroup, CommandItem } from "./command.tsx";

type HierarchyOptionsProps = {
  options: { value: string; label: string }[];
  selected: string | undefined;
  count?: (path: string) => number | undefined;
  showStop: boolean;
  stopLabel: string;
  onStop: () => void;
  onPick: (value: string) => void;
};

export function HierarchyOptions({
  options,
  selected,
  count,
  showStop,
  stopLabel,
  onStop,
  onPick,
}: HierarchyOptionsProps) {
  return (
    <CommandGroup>
      {showStop ? (
        <CommandItem value="-" onSelect={onStop}>
          {stopLabel}
        </CommandItem>
      ) : null}
      {options.map(({ value, label }) => {
        const optionCount = count?.(value);
        return (
          <CommandItem
            key={value}
            value={value}
            aria-checked={value === selected}
            aria-label={
              optionCount === undefined
                ? undefined
                : `${label} (${optionCount})`
            }
            onSelect={() => onPick(value)}
          >
            <CheckIcon
              className={cn(value === selected ? "opacity-100" : "opacity-0")}
            />
            {label}
            {optionCount !== undefined ? (
              <span className="text-muted-foreground ml-auto tabular-nums">
                {optionCount}
              </span>
            ) : null}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
