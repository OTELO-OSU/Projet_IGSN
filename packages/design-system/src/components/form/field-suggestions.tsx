import type { ReactNode } from "react";

import { Button } from "../ui/button.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import {
  useFieldSuggestionCascade,
  useFieldSuggestions,
} from "./field-suggestion-context.tsx";
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
  const cascade = useFieldSuggestionCascade();
  const isDisabled = useFieldDisabled();
  if (isDisabled || suggestions.length === 0) return null;
  return (
    <ul aria-label={rule.label} className="flex flex-wrap gap-2">
      {suggestions.map(({ source, value }, index) => {
        const text =
          value === undefined ? rule.noValueLabel : slotText(value, format);
        return (
          <li key={`${index}-${source}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-36 truncate"
              disabled={value === undefined}
              title={text}
              aria-label={`${source}: ${text}`}
              onClick={() => {
                for (const name of cascade) {
                  const gate = rule
                    .forField(name)
                    .find(
                      (entry) =>
                        entry.source === source && entry.value !== undefined,
                    );
                  if (gate) field.form.setFieldValue(name, gate.value);
                }
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
