import type { ReactNode } from "react";

import { Button } from "../ui/button.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { useFieldSuggestions } from "./field-suggestion-context.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

export function FieldSuggestions({
  format,
}: {
  format?: (value: unknown) => string;
}): ReactNode {
  const field = useFieldContext<unknown>();
  const { label, suggestions } = useFieldSuggestions();
  const isDisabled = useFieldDisabled();
  if (isDisabled || suggestions.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {suggestions.map(({ source, value }, index) => {
        const text = format?.(value) ?? String(value);
        return (
          <li key={`${index}-${source}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`${source}: ${text}`}
              onClick={() => {
                field.handleChange(value);
                field.handleBlur();
              }}
            >
              {text}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
