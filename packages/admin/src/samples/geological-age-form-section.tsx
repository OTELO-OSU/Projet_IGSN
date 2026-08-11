import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";

import { m } from "#/paraglide/messages.js";
import { AgeBoundField } from "#/samples/age-bound-field.tsx";
import { AgeModeRadio } from "#/samples/age-mode-radio.tsx";
import { useAgeSection } from "#/samples/use-age-section.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

// The free-text lithostratigraphic unit is independent of the ICS time scale,
// so it lives outside the toggle.
export function GeologicalAgeFormSection() {
  const isDisabled = useIsFieldDisabled("age.geologicalAgeMin");
  const form = useSampleForm();
  const { enabled, mode, toggleEnabled, changeMode } = useAgeSection([
    "geologicalAgeMin",
    "geologicalAgeMax",
  ]);

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
              <AgeBoundField
                control="geological"
                name="geologicalAgeMin"
                label={m.field_geological_age_min()}
                requiredWhenName="geologicalAgeMax"
              />
              <AgeBoundField
                control="geological"
                name="geologicalAgeMax"
                label={m.field_geological_age_max()}
                requiredWhenName="geologicalAgeMin"
              />
            </div>
          ) : (
            <AgeBoundField
              control="geological"
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
