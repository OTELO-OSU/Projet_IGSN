import { m } from "#/paraglide/messages.js";
import { MeasurementFields } from "#/samples/measurement-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

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
          ) : null
        }
      </form.Subscribe>
    </div>
  );
}
