import { createContext, useContext } from "react";

import { useFieldContext } from "./form-hook-contexts.tsx";

export type FieldSuggestion = { source: string; value: unknown };

export type FieldSuggestionRule = {
  label: string;
  noValueLabel: string;
  booleanLabel: (value: boolean) => string;
  forField: (name: string) => FieldSuggestion[];
};

export const NO_FIELD_SUGGESTIONS: FieldSuggestionRule = {
  label: "",
  noValueLabel: "",
  booleanLabel: String,
  forField: () => [],
};

const FieldSuggestionContext =
  createContext<FieldSuggestionRule>(NO_FIELD_SUGGESTIONS);

export const FieldSuggestionProvider = FieldSuggestionContext.Provider;

export function useFieldSuggestionRule(): FieldSuggestionRule {
  return useContext(FieldSuggestionContext);
}

export function useFieldSuggestions(): {
  rule: FieldSuggestionRule;
  suggestions: FieldSuggestion[];
} {
  const rule = useFieldSuggestionRule();
  const field = useFieldContext();
  return { rule, suggestions: rule.forField(field.name) };
}
