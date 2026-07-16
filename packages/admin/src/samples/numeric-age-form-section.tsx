import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { m } from "#/paraglide/messages.js";
import { AgeModeRadio } from "#/samples/age-mode-radio.tsx";
import { NumericBound } from "#/samples/numeric-bound.tsx";
import { useAgeForm } from "#/samples/use-age-form.ts";

const FIXED_FIELDS: (keyof AgeFormValues)[] = [
  "numericAge",
  "numericAgeUnit",
  "numericAgeYearsUnit",
];
const RANGE_FIELDS: (keyof AgeFormValues)[] = [
  "numericAgeMin",
  "numericAgeMinUnit",
  "numericAgeMinYearsUnit",
  "numericAgeMax",
  "numericAgeMaxUnit",
  "numericAgeMaxYearsUnit",
];
const ALL_FIELDS = [...FIXED_FIELDS, ...RANGE_FIELDS];

// Numeric age form section: an enable toggle and a Fixed/Range radio, both
// UI-only local state (not domain data). Disabling the section or switching mode clears
// the fields it hides, so a stale value never breaks the single-vs-range rule
// on submit. Render inside a `form.AppForm`.
export function NumericAgeFormSection() {
  const form = useAgeForm();
  const values = form.state.values.age;
  const clear = (fields: (keyof AgeFormValues)[]) => {
    for (const name of fields) form.setFieldValue(`age.${name}`, "");
  };

  // Off by default; on when edit prefill carries a value for the block.
  const [enabled, setEnabled] = useState(() =>
    ALL_FIELDS.some((name) => values[name]),
  );
  const [mode, setMode] = useState<AgeMode>(() =>
    values.numericAgeMin || values.numericAgeMax ? "range" : "fixed",
  );

  const toggleEnabled = (next: boolean) => {
    setEnabled(next);
    if (!next) clear(ALL_FIELDS);
  };
  const changeMode = (next: AgeMode) => {
    setMode(next);
    clear(next === "fixed" ? RANGE_FIELDS : FIXED_FIELDS);
  };

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 flex items-center gap-2 font-medium">
        {m.section_numeric_age()}
        <Switch
          checked={enabled}
          onCheckedChange={toggleEnabled}
          aria-label={m.age_numeric_toggle()}
        />
      </legend>

      {enabled ? (
        <>
          <AgeModeRadio
            mode={mode}
            onChange={changeMode}
            idPrefix="numeric-mode"
            label={m.age_numeric_mode()}
          />

          {mode === "range" ? (
            <>
              <NumericBound
                valueName="numericAgeMin"
                unitName="numericAgeMinUnit"
                yearsName="numericAgeMinYearsUnit"
                valueLabel={m.field_numeric_age_min()}
                requiredWhenName="numericAgeMax"
              />
              <NumericBound
                valueName="numericAgeMax"
                unitName="numericAgeMaxUnit"
                yearsName="numericAgeMaxYearsUnit"
                valueLabel={m.field_numeric_age_max()}
                requiredWhenName="numericAgeMin"
              />
            </>
          ) : (
            <NumericBound
              valueName="numericAge"
              unitName="numericAgeUnit"
              yearsName="numericAgeYearsUnit"
              valueLabel={m.field_numeric_age()}
            />
          )}
        </>
      ) : null}
    </fieldset>
  );
}
