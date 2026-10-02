import { createContext, useContext } from "react";

import { useFieldContext } from "./form-hook-contexts.tsx";

const FieldRequiredContext = createContext<
  ((name: string) => boolean) | undefined
>(undefined);

export const FieldRequiredProvider = FieldRequiredContext.Provider;

export function useFieldRequiredRule(): (name: string) => boolean {
  const rule = useContext(FieldRequiredContext);
  return rule ?? (() => false);
}

export function useFieldRequired(requiredToPublish = false): boolean {
  const field = useFieldContext();
  const rule = useContext(FieldRequiredContext);
  return rule ? rule(field.name) : requiredToPublish;
}
