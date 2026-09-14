import { FieldSuggestionCascadeProvider } from "@projet-igsn/design-system/components/form/field-suggestion-context";

import { m } from "#/paraglide/messages.js";
import { MeasurementFields } from "#/samples/measurement-fields.tsx";
import { SuggestionOnlyRow } from "#/samples/suggestion-only-row.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const ORIENTED_GATE = ["description.oriented"];

export function SampleDescriptionFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.AppField name="description.openDescription">
        {(field) => (
          <field.TextField label={m.field_open_description()} multiline />
        )}
      </form.AppField>

      <MeasurementFields />

      <form.AppField name="description.oriented">
        {(field) => <field.SwitchField label={m.field_oriented()} />}
      </form.AppField>

      <FieldSuggestionCascadeProvider value={ORIENTED_GATE}>
        <form.Subscribe selector={(state) => state.values.description.oriented}>
          {(oriented) =>
            oriented ? (
              <form.AppField name="description.orientationExplanation">
                {(field) => (
                  <field.TextField
                    label={m.field_orientation_explanation()}
                    multiline
                  />
                )}
              </form.AppField>
            ) : (
              <SuggestionOnlyRow
                name="description.orientationExplanation"
                label={m.field_orientation_explanation()}
              />
            )
          }
        </form.Subscribe>
      </FieldSuggestionCascadeProvider>
    </div>
  );
}
