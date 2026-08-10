import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { m } from "#/paraglide/messages.js";
import { AgeModeRadio } from "#/samples/age-mode-radio.tsx";
import { GeologicalField } from "#/samples/geological-field.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const BOUND_FIELDS: (keyof AgeFormValues)[] = [
  "geologicalAgeMin",
  "geologicalAgeMax",
];

// The free-text lithostratigraphic unit is independent of the ICS time scale,
// so it lives outside the toggle.
export function GeologicalAgeFormSection() {
  const isDisabled = useIsFieldDisabled("age.geologicalAgeMin");
  const form = useSampleForm();
  const values = form.state.values.age;
  const clear = (fields: (keyof AgeFormValues)[]) => {
    for (const name of fields) form.setFieldValue(`age.${name}`, undefined);
  };

  const [enabled, setEnabled] = useState(() =>
    BOUND_FIELDS.some((name) => values[name]),
  );
  const [mode, setMode] = useState<AgeMode>(() =>
    values.geologicalAgeMin &&
    values.geologicalAgeMin === values.geologicalAgeMax
      ? "fixed"
      : values.geologicalAgeMin || values.geologicalAgeMax
        ? "range"
        : "fixed",
  );

  const toggleEnabled = (next: boolean) => {
    setEnabled(next);
    if (!next) clear(BOUND_FIELDS);
  };
  const changeMode = (next: AgeMode) => {
    setMode(next);
    clear(BOUND_FIELDS);
  };

  return (
    <FormSection
      level={3}
      title={m.section_stratigraphic_age()}
      action={
        <Switch
          checked={enabled}
          disabled={isDisabled}
          onCheckedChange={toggleEnabled}
          aria-label={m.age_stratigraphic_toggle()}
        />
      }
    >
      {enabled ? (
        <>
          <AgeModeRadio
            mode={mode}
            onChange={changeMode}
            idPrefix="geological-mode"
            label={m.age_geological_mode()}
            disabled={isDisabled}
          />

          {mode === "range" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <GeologicalField
                name="geologicalAgeMin"
                label={m.field_geological_age_min()}
                requiredWhenName="geologicalAgeMax"
              />
              <GeologicalField
                name="geologicalAgeMax"
                label={m.field_geological_age_max()}
                requiredWhenName="geologicalAgeMin"
              />
            </div>
          ) : (
            <GeologicalField
              name="geologicalAgeMin"
              label={m.field_geological_age()}
              mirrorName="geologicalAgeMax"
            />
          )}
        </>
      ) : null}

      <form.AppField name="age.geologicalUnit">
        {(field) => <field.TextField label={m.field_geological_unit()} />}
      </form.AppField>
    </FormSection>
  );
}
