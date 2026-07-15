import { m } from "#/paraglide/messages.js";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

// Point coordinates: longitude, latitude and a single elevation value.
export function LocationPointFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name="location.longitude">
        {(field) => (
          <field.TextField
            number
            label={withRequired(m.field_longitude(), required)}
          />
        )}
      </form.AppField>
      <form.AppField name="location.latitude">
        {(field) => (
          <field.TextField
            number
            label={withRequired(m.field_latitude(), required)}
          />
        )}
      </form.AppField>
      {/* Alone on its row, so it spans both columns. */}
      <div className="sm:col-span-2">
        <form.AppField name="location.elevationValue">
          {(field) => (
            // Signed value: bathymetry below the datum, elevation above.
            <field.TextField
              number
              label={
                Number(field.state.value) < 0
                  ? m.field_bathymetry()
                  : m.field_elevation()
              }
            />
          )}
        </form.AppField>
      </div>
    </div>
  );
}
