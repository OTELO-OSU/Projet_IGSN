import { createContext, useContext } from "react";

import { useFieldContext } from "./form-hook-contexts.tsx";

const FieldDisabledContext = createContext<(name: string) => boolean>(
  () => false,
);

export const FieldDisabledProvider = FieldDisabledContext.Provider;

export function useFieldDisabledRule(): (name: string) => boolean {
  return useContext(FieldDisabledContext);
}

export function useIsFieldDisabled(name: string): boolean {
  return useFieldDisabledRule()(name);
}

export function useFieldDisabled(disabled?: boolean): boolean {
  const field = useFieldContext();
  const isFieldDisabled = useIsFieldDisabled(field.name);
  return disabled === true || isFieldDisabled;
}
