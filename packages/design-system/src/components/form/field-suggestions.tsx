import type { ReactNode } from "react";

import { Button } from "../ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { useFieldSuggestionRule } from "./field-suggestion-context.tsx";
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
  const rule = useFieldSuggestionRule();
  const suggestions = rule
    .forField(field.name)
    .map((suggestion, index) => ({ ...suggestion, index }))
    .filter(({ value }) => value !== undefined);
  const isDisabled = useFieldDisabled();
  if (isDisabled || suggestions.length === 0) return null;
  return (
    <ul
      aria-label={rule.label}
      className="flex min-w-0 flex-col gap-1 text-sm sm:pt-7"
    >
      {suggestions.map(({ source, value, index }) => {
        const text = slotText(value, format);
        return (
          <li className="min-w-0" key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto max-w-full gap-1 p-0 text-sm"
                  aria-label={`${source}: ${text}`}
                  onClick={() => {
                    field.handleChange(value);
                    field.handleBlur();
                  }}
                >
                  <span className="text-muted-foreground">
                    {rule.sourceShortLabel(index)}
                  </span>
                  <span className="max-w-64 truncate">{text}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{source}</TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
