import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { numericUnitSchema } from "@projet-igsn/domain/sample/age/numeric-unit";
import { yearsUnitSchema } from "@projet-igsn/domain/sample/age/years-unit";
import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { m } from "#/paraglide/messages.js";
import { hasNumericAgeValue, numericAgeUnitOf } from "#/samples/age-form.ts";
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

const VALUE_FIELDS: (keyof AgeFormValues)[] = [
  "numericAgeMin",
  "numericAgeMax",
];
const ALL_FIELDS: (keyof AgeFormValues)[] = [
  ...VALUE_FIELDS,
  "numericAgeUnit",
  "numericAgeYearsUnit",
];

export function NumericAgeFormSection() {
  const form = useAgeForm();
  const values = form.state.values.age;
  const clear = (fields: (keyof AgeFormValues)[]) => {
    for (const name of fields) form.setFieldValue(`age.${name}`, undefined);
  };

  const [enabled, setEnabled] = useState(() =>
    ALL_FIELDS.some((name) => values[name] != null),
  );
  // A non-range value stores min == max. Guard with `!= null` so a `0` bound is
  // not misread as empty.
  const [mode, setMode] = useState<AgeMode>(() =>
    values.numericAgeMin != null &&
    values.numericAgeMin === values.numericAgeMax
      ? "fixed"
      : values.numericAgeMin != null || values.numericAgeMax != null
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
    <FormSection
      level={3}
      title={m.section_numeric_age()}
      action={
        <Switch
          checked={enabled}
          onCheckedChange={toggleEnabled}
          aria-label={m.age_numeric_toggle()}
        />
      }
    >
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
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
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
              <div className="sm:col-span-2">
                <NumericValueField
                  name="numericAgeMin"
                  label={m.field_numeric_age()}
                  mirrorName="numericAgeMax"
                />
              </div>
            )}

            <form.Subscribe
              selector={(state) => hasNumericAgeValue(state.values.age)}
            >
              {(hasValue) =>
                hasValue ? (
                  <form.AppField name="age.numericAgeUnit">
                    {(field) => (
                      <field.ComboboxField
                        label={m.field_numeric_unit()}
                        requiredToPublish
                        items={numericUnitItems}
                        placeholder={m.age_unit_placeholder()}
                        searchPlaceholder={m.age_unit_search_placeholder()}
                        emptyText={m.age_unit_empty()}
                      />
                    )}
                  </form.AppField>
                ) : null
              }
            </form.Subscribe>
            <form.Subscribe
              selector={(state) =>
                numericAgeUnitOf(state.values.age) === numericUnitSchema.enum.a
              }
            >
              {(isAnnum) =>
                isAnnum ? (
                  <form.AppField name="age.numericAgeYearsUnit">
                    {(field) => (
                      <field.ComboboxField
                        label={m.field_numeric_years_unit()}
                        requiredToPublish
                        items={yearsUnitItems}
                        placeholder={m.age_years_placeholder()}
                        searchPlaceholder={m.age_years_search_placeholder()}
                        emptyText={m.age_years_empty()}
                      />
                    )}
                  </form.AppField>
                ) : null
              }
            </form.Subscribe>
          </div>
        </>
      ) : null}
    </FormSection>
  );
}
