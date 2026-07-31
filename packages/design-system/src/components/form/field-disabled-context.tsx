import { createContext, useContext } from "react";

import { useFieldContext } from "./form-hook-contexts.tsx";

// A form-level rule deciding, by field name, that a control is disabled. The
// kit stays generic: it never learns why (the calling app owns the reason).
const FieldDisabledContext = createContext<(name: string) => boolean>(
  () => false,
);

export const FieldDisabledProvider = FieldDisabledContext.Provider;

// For a control that sits outside a field context and must name the field whose
// rule it follows.
export function useIsFieldDisabled(name: string): boolean {
  return useContext(FieldDisabledContext)(name);
}

export function useFieldDisabled(disabled?: boolean): boolean {
  const field = useFieldContext();
  const isFieldDisabled = useIsFieldDisabled(field.name);
  return disabled === true || isFieldDisabled;
}
