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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="grid min-w-0 flex-1 content-start gap-2">{children}</div>
      <FieldSuggestions format={format} />
    </div>
  );
}
