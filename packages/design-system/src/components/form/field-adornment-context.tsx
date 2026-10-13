import { createContext, type ReactNode, useContext } from "react";

import { withRequired } from "../../lib/with-required.ts";
import { Label } from "../ui/label.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

const FieldAdornmentContext = createContext<(name: string) => ReactNode>(
  () => null,
);

export const FieldAdornmentProvider = FieldAdornmentContext.Provider;

export function useFieldAdornmentRule(): (name: string) => ReactNode {
  return useContext(FieldAdornmentContext);
}

export function FieldLabel({
  label,
  isRequired,
}: {
  label: string;
  isRequired: boolean;
}) {
  const field = useFieldContext();
  const adornment = useFieldAdornmentRule()(field.name);
  const fieldLabel = (
    <Label htmlFor={field.name}>{withRequired(label, isRequired)}</Label>
  );
  if (adornment == null) return fieldLabel;
  return (
    <div className="flex items-center gap-1">
      {fieldLabel}
      {adornment}
    </div>
  );
}
