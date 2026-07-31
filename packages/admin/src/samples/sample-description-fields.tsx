import { m } from "#/paraglide/messages.js";
import { CollectionDatesField } from "#/samples/collection-dates-field.tsx";
import { MeasurementFields } from "#/samples/measurement-fields.tsx";
import { useDescriptionForm } from "#/samples/use-description-form.ts";

const orientedItems = [
  { value: "yes", label: m.oriented_yes() },
  { value: "no", label: m.oriented_no() },
];

// The Description tab (ADR 0015). Render inside a `form.AppForm`.
export function SampleDescriptionFields() {
  const form = useDescriptionForm();
  return (
    <div className="grid gap-4">
      <CollectionDatesField />

      <form.AppField name="description.oriented">
        {(field) => (
          <field.ComboboxField
            label={m.field_oriented()}
            items={orientedItems}
            placeholder={m.oriented_placeholder()}
            searchPlaceholder={m.oriented_search_placeholder()}
            emptyText={m.oriented_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => state.values.description.oriented === "yes"}
      >
        {(oriented) => (
          <form.AppField name="description.orientationExplanation">
            {(field) => (
              <field.TextField
                label={m.field_orientation_explanation()}
                multiline
                disabled={!oriented}
              />
            )}
          </form.AppField>
        )}
      </form.Subscribe>

      <MeasurementFields />

      <form.AppField name="description.openDescription">
        {(field) => (
          <field.TextField label={m.field_open_description()} multiline />
        )}
      </form.AppField>
    </div>
  );
}
