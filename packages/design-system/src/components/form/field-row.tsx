import type { ReactNode } from "react";

import { FieldSuggestions } from "./field-suggestions.tsx";

export function FieldRow({
  format,
  children,
}: {
  format?: (value: unknown) => string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <div className="grid min-w-0 content-start gap-2 sm:w-72 sm:flex-none">
        {children}
      </div>
      <FieldSuggestions format={format} />
    </div>
  );
}
