import { m } from "#/paraglide/messages.js";
import { isOrientedYes } from "#/samples/compose-description.ts";
import { DateRangeField } from "#/samples/date-range-field.tsx";
import { MeasurementFields } from "#/samples/measurement-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const orientedItems = [
  { value: "yes", label: m.oriented_yes() },
  { value: "no", label: m.oriented_no() },
];

export function SampleDescriptionFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <DateRangeField
        prefix="description.collectionDate"
        id="collection-dates"
        groupLabel={m.field_collection_dates()}
        rangeModeLabel={m.collection_date_mode_range()}
        singleLabel={m.field_collection_date()}
        startLabel={m.field_collection_date_start()}
        endLabel={m.field_collection_date_end()}
        identicalMessage={m.collection_date_range_identical}
      />

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
        selector={(state) => isOrientedYes(state.values.description.oriented)}
      >
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

      <MeasurementFields />

      <form.AppField name="description.openDescription">
        {(field) => (
          <field.TextField label={m.field_open_description()} multiline />
        )}
      </form.AppField>
    </div>
  );
}
