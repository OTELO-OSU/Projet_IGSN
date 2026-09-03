import { m } from "#/paraglide/messages.js";
import { DateRangeField } from "#/samples/date-range-field.tsx";
import { MeasurementFields } from "#/samples/measurement-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

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
        time={{
          precisionName: "description.collectionDatePrecision",
          timeZoneName: "description.collectionDateTimeZone",
          modeLabel: m.collection_date_mode_time(),
          zoneLabel: m.field_collection_time_zone(),
          zonePlaceholder: m.time_zone_placeholder(),
          zoneSearchPlaceholder: m.time_zone_search_placeholder(),
          zoneEmptyText: m.time_zone_empty(),
        }}
      />

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

      <MeasurementFields />

      <form.AppField name="description.openDescription">
        {(field) => (
          <field.TextField label={m.field_open_description()} multiline />
        )}
      </form.AppField>
    </div>
  );
}
