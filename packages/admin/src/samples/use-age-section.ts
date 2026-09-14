import { useFieldSuggestionRule } from "@projet-igsn/design-system/components/form/field-suggestion-context";
import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { useSampleForm } from "#/samples/use-sample-form.ts";

const isSet = (value: AgeFormValues[keyof AgeFormValues]) =>
  value != null && value !== "";

export function useAgeSection(
  boundFields: [keyof AgeFormValues, keyof AgeFormValues],
  allFields: (keyof AgeFormValues)[] = boundFields,
) {
  const form = useSampleForm();
  const { forField } = useFieldSuggestionRule();
  const values = form.state.values.age;
  const [min, max] = boundFields;

  const isSuggested = (name: keyof AgeFormValues) =>
    forField(`age.${name}`).some(({ value }) => value !== undefined);

  const [enabled, setEnabled] = useState(() =>
    allFields.some((name) => isSet(values[name]) || isSuggested(name)),
  );
  const [mode, setMode] = useState<AgeMode>(() => {
    if (isSet(values[min]) && values[min] === values[max]) return "fixed";
    return isSet(values[min]) || isSet(values[max]) ? "range" : "fixed";
  });

  const clear = (fields: (keyof AgeFormValues)[]) => {
    for (const name of fields) form.setFieldValue(`age.${name}`, undefined);
  };

  return {
    enabled,
    mode,
    toggleEnabled: (next: boolean) => {
      setEnabled(next);
      if (!next) clear(allFields);
    },
    changeMode: (next: AgeMode) => {
      setMode(next);
      clear(boundFields);
    },
  };
}
