import { createContext, useContext } from "react";

export type FieldSuggestion = { source: string; value: unknown };

export type FieldSuggestionRule = {
  label: string;
  sourceShortLabel: (index: number) => string;
  booleanLabel: (value: boolean) => string;
  forField: (name: string) => FieldSuggestion[];
};

export const NO_FIELD_SUGGESTIONS: FieldSuggestionRule = {
  label: "",
  sourceShortLabel: () => "",
  booleanLabel: String,
  forField: () => [],
};

const FieldSuggestionContext =
  createContext<FieldSuggestionRule>(NO_FIELD_SUGGESTIONS);

export const FieldSuggestionProvider = FieldSuggestionContext.Provider;

export function useFieldSuggestionRule(): FieldSuggestionRule {
  return useContext(FieldSuggestionContext);
}
