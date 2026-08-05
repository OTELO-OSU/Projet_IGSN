import { m } from "#/paraglide/messages.js";
import { LocationElevationFields } from "#/samples/location-elevation-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";

export function LocationPointFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name="location.longitude">
        {(field) => (
          <field.NumberField
            label={m.field_longitude()}
            requiredToPublish={required}
            hint={m.field_longitude_hint()}
          />
        )}
      </form.AppField>
      <form.AppField name="location.latitude">
        {(field) => (
          <field.NumberField
            label={m.field_latitude()}
            requiredToPublish={required}
            hint={m.field_latitude_hint()}
          />
        )}
      </form.AppField>
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
        <form.AppField name="location.elevationValue">
          {(field) => (
            <field.NumberField
              label={
                (field.state.value ?? 0) < 0
                  ? m.field_bathymetry()
                  : m.field_elevation()
              }
            />
          )}
        </form.AppField>
        <LocationElevationFields />
      </div>
    </div>
  );
}
