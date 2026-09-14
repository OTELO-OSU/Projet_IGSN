import type { ReactNode } from "react";

import { Button } from "../ui/button.tsx";
import { Label } from "../ui/label.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { useFieldSuggestions } from "./field-suggestion-context.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

const slotText = (
  value: unknown,
  format?: (value: unknown) => string,
): string => format?.(value) ?? String(value);

export function FieldSuggestions({
  format,
}: {
  format?: (value: unknown) => string;
}): ReactNode {
  const field = useFieldContext<unknown>();
  const { rule, suggestions } = useFieldSuggestions();
  const isDisabled = useFieldDisabled();
  if (isDisabled || suggestions.length === 0) return null;
  return (
    <ul
      aria-label={rule.label}
      className="flex min-w-0 gap-2 sm:flex-none sm:basis-1/2"
    >
      {suggestions.map(({ source, value }, index) => {
        const text =
          value === undefined ? rule.noValueLabel : slotText(value, format);
        const chip = (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            disabled={value === undefined}
            aria-label={`${source}: ${text}`}
            onClick={() => {
              field.handleChange(value);
              field.handleBlur();
            }}
          >
            <span className="min-w-0 truncate">{text}</span>
          </Button>
        );
        return (
          <li
            className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-2"
            key={`${index}-${source}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Label asChild>
                  <span className="block truncate">{source}</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent>{source}</TooltipContent>
            </Tooltip>
            {value === undefined ? (
              chip
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>{chip}</TooltipTrigger>
                <TooltipContent>{text}</TooltipContent>
              </Tooltip>
            )}
          </li>
        );
      })}
    </ul>
  );
}
