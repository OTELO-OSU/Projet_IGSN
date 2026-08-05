import { m } from "#/paraglide/messages.js";
import { LocationElevationFields } from "#/samples/location-elevation-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";

const boundFields = [
  ["location.westLongitude", m.field_west_longitude, m.field_longitude_hint],
  ["location.eastLongitude", m.field_east_longitude, m.field_longitude_hint],
  ["location.southLatitude", m.field_south_latitude, m.field_latitude_hint],
  ["location.northLatitude", m.field_north_latitude, m.field_latitude_hint],
] as const;

const rangeFields = [
  {
    key: "elevationMin",
    siblingKey: "elevationMax",
    label: m.field_elevation_min,
  },
  {
    key: "elevationMax",
    siblingKey: "elevationMin",
    label: m.field_elevation_max,
  },
] as const;

export function LocationAreaFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {boundFields.map(([name, label, hint]) => (
        <form.AppField key={name} name={name}>
          {(field) => (
            <field.NumberField
              label={label()}
              requiredToPublish={required}
              hint={hint()}
            />
          )}
        </form.AppField>
      ))}
      <form.Subscribe
        selector={(state) => ({
          elevationMin: state.values.location.elevationMin !== undefined,
          elevationMax: state.values.location.elevationMax !== undefined,
        })}
      >
        {(isSet) =>
          rangeFields.map(({ key, siblingKey, label }) => (
            <form.AppField key={key} name={`location.${key}`}>
              {(field) => (
                <field.NumberField
                  label={label()}
                  requiredToPublish={isSet[siblingKey]}
                />
              )}
            </form.AppField>
          ))
        }
      </form.Subscribe>
      <LocationElevationFields />
    </div>
  );
}
