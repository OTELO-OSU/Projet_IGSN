import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { numericUnitSchema } from "@projet-igsn/domain/sample/age/numeric-unit";
import { yearsUnitSchema } from "@projet-igsn/domain/sample/age/years-unit";
import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { m } from "#/paraglide/messages.js";
import { AgeModeRadio } from "#/samples/age-mode-radio.tsx";
import { NumericValueField } from "#/samples/numeric-value-field.tsx";
import { numericUnitLabel, yearsUnitLabel } from "#/samples/sample-labels.ts";
import { useAgeForm } from "#/samples/use-age-form.ts";

const numericUnitItems = numericUnitSchema.options.map((unit) => ({
  value: unit,
  label: numericUnitLabel(unit),
}));
const yearsUnitItems = yearsUnitSchema.options.map((unit) => ({
  value: unit,
  label: yearsUnitLabel(unit),
}));

// Fixed and range share the min/max value fields; the unit and reference are
// shared across the whole numeric age.
const VALUE_FIELDS: (keyof AgeFormValues)[] = [
  "numericAgeMin",
  "numericAgeMax",
];
const ALL_FIELDS: (keyof AgeFormValues)[] = [
  ...VALUE_FIELDS,
  "numericAgeUnit",
  "numericAgeYearsUnit",
];

// Numeric age form section: an enable toggle and a Fixed/Range radio, both
// UI-only local state (not domain data). One shared unit and reference apply to
// the whole numeric age. A fixed value is stored in both bounds (min == max);
// switching mode or disabling the section clears the value fields. Render inside
// a `form.AppForm`.
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
  // A non-range value stores min == max; a real or half-entered range is range
  // mode.
  const [mode, setMode] = useState<AgeMode>(() =>
    values.numericAgeMin && values.numericAgeMin === values.numericAgeMax
      ? "fixed"
      : values.numericAgeMin || values.numericAgeMax
        ? "range"
        : "fixed",
  );

  const toggleEnabled = (next: boolean) => {
    setEnabled(next);
    if (!next) clear(ALL_FIELDS);
  };
  const changeMode = (next: AgeMode) => {
    setMode(next);
    clear(VALUE_FIELDS);
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mode === "range" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                <NumericValueField
                  name="numericAgeMin"
                  label={m.field_numeric_age_min()}
                  requiredWhenName="numericAgeMax"
                />
                <NumericValueField
                  name="numericAgeMax"
                  label={m.field_numeric_age_max()}
                  requiredWhenName="numericAgeMin"
                />
              </div>
            ) : (
              <div className="lg:col-span-2">
                <NumericValueField
                  name="numericAgeMin"
                  label={m.field_numeric_age()}
                  mirrorName="numericAgeMax"
                />
              </div>
            )}

            <form.AppField
              name="age.numericAgeUnit"
              listeners={{
                // The reference is only meaningful for annum; clear it when the
                // unit changes to anything else.
                onChange: ({ value }) => {
                  if (value !== numericUnitSchema.enum.a)
                    form.setFieldValue("age.numericAgeYearsUnit", "");
                },
              }}
            >
              {(field) => (
                // A numeric value must state its unit before publish, so the unit
                // is required once a value is entered (publish blocker
                // numeric_age_unit_missing); disabled until then.
                <form.Subscribe
                  selector={(state) =>
                    Boolean(
                      state.values.age.numericAgeMin.trim() ||
                      state.values.age.numericAgeMax.trim(),
                    )
                  }
                >
                  {(required) => (
                    <field.ComboboxField
                      label={m.field_numeric_unit()}
                      requiredToPublish={required}
                      items={numericUnitItems}
                      placeholder={m.age_unit_placeholder()}
                      searchPlaceholder={m.age_unit_search_placeholder()}
                      emptyText={m.age_unit_empty()}
                      disabled={!required}
                    />
                  )}
                </form.Subscribe>
              )}
            </form.AppField>
            <form.AppField name="age.numericAgeYearsUnit">
              {(field) => (
                // A reference is required (and only meaningful) once the unit is
                // annum (publish blocker numeric_age_reference_missing);
                // disabled otherwise.
                <form.Subscribe
                  selector={(state) =>
                    state.values.age.numericAgeUnit === numericUnitSchema.enum.a
                  }
                >
                  {(required) => (
                    <field.ComboboxField
                      label={m.field_numeric_years_unit()}
                      requiredToPublish={required}
                      items={yearsUnitItems}
                      placeholder={m.age_years_placeholder()}
                      searchPlaceholder={m.age_years_search_placeholder()}
                      emptyText={m.age_years_empty()}
                      disabled={!required}
                    />
                  )}
                </form.Subscribe>
              )}
            </form.AppField>
          </div>
        </>
      ) : null}
    </fieldset>
  );
}
