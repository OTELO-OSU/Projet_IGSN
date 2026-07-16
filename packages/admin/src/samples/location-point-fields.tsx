import { m } from "#/paraglide/messages.js";
import { elevationIntegerError } from "#/samples/elevation-integer-error.ts";
import { LocationElevationFields } from "#/samples/location-elevation-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

// Point coordinates: longitude, latitude and a single elevation value, the
// latter sharing its row with the unit/datum fields (2/1/1).
export function LocationPointFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <form.AppField name="location.longitude">
          {(field) => (
            <field.NumberField
              label={withRequired(m.field_longitude(), required)}
            />
          )}
        </form.AppField>
      </div>
      <div className="sm:col-span-2">
        <form.AppField name="location.latitude">
          {(field) => (
            <field.NumberField
              label={withRequired(m.field_latitude(), required)}
            />
          )}
        </form.AppField>
      </div>
      <div className="sm:col-span-2">
        <form.AppField
          name="location.elevationValue"
          validators={{
            onChange: ({ value }) => elevationIntegerError(value),
          }}
        >
          {(field) => (
            // Signed value: bathymetry below the datum, elevation above.
            <field.NumberField
              label={
                (field.state.value ?? 0) < 0
                  ? m.field_bathymetry()
                  : m.field_elevation()
              }
            />
          )}
        </form.AppField>
      </div>
      <LocationElevationFields />
    </div>
  );
}
