import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { useState } from "react";

import type { AgeFormValues } from "#/samples/age-form.ts";
import type { AgeMode } from "#/samples/age-mode-radio.tsx";

import { m } from "#/paraglide/messages.js";
import { AgeModeRadio } from "#/samples/age-mode-radio.tsx";
import { GeologicalField } from "#/samples/geological-field.tsx";
import { useAgeForm } from "#/samples/use-age-form.ts";

const FIXED_FIELDS: (keyof AgeFormValues)[] = ["geologicalAge"];
const RANGE_FIELDS: (keyof AgeFormValues)[] = [
  "geologicalAgeMin",
  "geologicalAgeMax",
];
const ALL_FIELDS: (keyof AgeFormValues)[] = [
  ...FIXED_FIELDS,
  ...RANGE_FIELDS,
  "geologicalUnit",
];

// Stratigraphic age form section: same enable/mode UI as the numeric section, plus a
// free-text unit. The toggle and mode radio are UI-only local state; disabling
// or switching clears the hidden fields so no stale value survives to submit.
// Render inside a `form.AppForm`.
export function GeologicalAgeFormSection() {
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
    values.geologicalAgeMin || values.geologicalAgeMax ? "range" : "fixed",
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
        {m.section_stratigraphic_age()}
        <Switch
          checked={enabled}
          onCheckedChange={toggleEnabled}
          aria-label={m.age_stratigraphic_toggle()}
        />
      </legend>

      {enabled ? (
        <>
          <AgeModeRadio
            mode={mode}
            onChange={changeMode}
            idPrefix="geological-mode"
            label={m.age_geological_mode()}
          />

          {mode === "range" ? (
            <>
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
            </>
          ) : (
            <GeologicalField
              name="geologicalAge"
              label={m.field_geological_age()}
            />
          )}

          <form.AppField name="age.geologicalUnit">
            {(field) => <field.TextField label={m.field_geological_unit()} />}
          </form.AppField>
        </>
      ) : null}
    </fieldset>
  );
}
