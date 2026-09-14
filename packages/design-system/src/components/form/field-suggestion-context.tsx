import { createContext, useContext } from "react";

import { useFieldContext } from "./form-hook-contexts.tsx";

export type FieldSuggestion = { source: string; value: unknown };

export type FieldSuggestionRule = {
  label: string;
  forField: (name: string) => FieldSuggestion[];
};

export const NO_FIELD_SUGGESTIONS: FieldSuggestionRule = {
  label: "",
  forField: () => [],
};

const FieldSuggestionContext =
  createContext<FieldSuggestionRule>(NO_FIELD_SUGGESTIONS);

export const FieldSuggestionProvider = FieldSuggestionContext.Provider;

export function useFieldSuggestions(): {
  label: string;
  suggestions: FieldSuggestion[];
} {
  const { label, forField } = useContext(FieldSuggestionContext);
  const field = useFieldContext();
  return { label, suggestions: forField(field.name) };
}
