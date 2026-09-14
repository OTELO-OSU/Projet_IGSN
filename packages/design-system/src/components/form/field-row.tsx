import type { ReactNode } from "react";

import { cn } from "../../lib/utils.ts";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { useFieldSuggestions } from "./field-suggestion-context.tsx";
import { FieldSuggestions } from "./field-suggestions.tsx";

export function FieldRow({
  format,
  children,
}: {
  format?: (value: unknown) => string;
  children: ReactNode;
}) {
  const { suggestions } = useFieldSuggestions();
  const hasSlots = !useFieldDisabled() && suggestions.length > 0;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div
        className={cn(
          "grid min-w-0 flex-1 content-start gap-2",
          hasSlots && "sm:flex-none sm:basis-1/2",
        )}
      >
        {children}
      </div>
      <FieldSuggestions format={format} />
    </div>
  );
}
