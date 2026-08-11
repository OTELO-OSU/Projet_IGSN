import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { useSampleForm } from "#/samples/use-sample-form.ts";

const isSet = (value: AgeFormValues[keyof AgeFormValues]) =>
  value != null && value !== "";

// The toggle owns every field of the block and the mode owns only its bounds, so
// a value hidden by either never survives as a saved one (ADR 0015 rule 2).
export function useAgeSection(
  boundFields: [keyof AgeFormValues, keyof AgeFormValues],
  allFields: (keyof AgeFormValues)[] = boundFields,
) {
  const form = useSampleForm();
  const values = form.state.values.age;
  const [min, max] = boundFields;

  const [enabled, setEnabled] = useState(() =>
    allFields.some((name) => isSet(values[name])),
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
