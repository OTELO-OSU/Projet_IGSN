import { m } from "#/paraglide/messages.js";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

// Area coordinates: the four bounds and the elevation range.
export function LocationAreaFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name="location.westLongitude">
        {(field) => (
          <field.TextField
            number
            label={withRequired(m.field_west_longitude(), required)}
          />
        )}
      </form.AppField>
      <form.AppField name="location.eastLongitude">
        {(field) => (
          <field.TextField
            number
            label={withRequired(m.field_east_longitude(), required)}
          />
        )}
      </form.AppField>
      <form.AppField name="location.southLatitude">
        {(field) => (
          <field.TextField
            number
            label={withRequired(m.field_south_latitude(), required)}
          />
        )}
      </form.AppField>
      <form.AppField name="location.northLatitude">
        {(field) => (
          <field.TextField
            number
            label={withRequired(m.field_north_latitude(), required)}
          />
        )}
      </form.AppField>
      {/* An area elevation is a range: setting one bound requires the other,
          so each is marked required once its sibling is set. */}
      <form.Subscribe
        selector={(state) => ({
          minSet: Boolean(state.values.location.elevationMin),
          maxSet: Boolean(state.values.location.elevationMax),
        })}
      >
        {({ minSet, maxSet }) => (
          <>
            <form.AppField
              name="location.elevationMin"
              validators={{
                onChangeListenTo: ["location.elevationMax"],
                onChange: ({ value, fieldApi }) =>
                  fieldApi.form.state.values.location.elevationMax && !value
                    ? { message: m.field_elevation_min_required() }
                    : undefined,
              }}
            >
              {(field) => (
                <field.TextField
                  number
                  label={withRequired(m.field_elevation_min(), maxSet)}
                />
              )}
            </form.AppField>
            <form.AppField
              name="location.elevationMax"
              validators={{
                onChangeListenTo: ["location.elevationMin"],
                onChange: ({ value, fieldApi }) =>
                  fieldApi.form.state.values.location.elevationMin && !value
                    ? { message: m.field_elevation_max_required() }
                    : undefined,
              }}
            >
              {(field) => (
                <field.TextField
                  number
                  label={withRequired(m.field_elevation_max(), minSet)}
                />
              )}
            </form.AppField>
          </>
        )}
      </form.Subscribe>
    </div>
  );
}
