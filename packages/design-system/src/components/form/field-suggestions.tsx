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
    <ul aria-label={rule.label} className="flex flex-wrap gap-2">
      {suggestions.map(({ source, value }, index) => {
        const text =
          value === undefined ? rule.noValueLabel : slotText(value, format);
        const chip = (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-36 justify-start"
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
          <li className="grid content-start gap-2" key={`${index}-${source}`}>
            <Label asChild>
              <span>{source}</span>
            </Label>
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
