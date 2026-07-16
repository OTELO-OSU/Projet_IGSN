import { m } from "#/paraglide/messages.js";
import { elevationIntegerError } from "#/samples/elevation-integer-error.ts";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

const boundFields = [
  ["location.westLongitude", m.field_west_longitude],
  ["location.eastLongitude", m.field_east_longitude],
  ["location.southLatitude", m.field_south_latitude],
  ["location.northLatitude", m.field_north_latitude],
] as const;

// An area elevation is a range: setting one bound requires the other, so each
// bound is required (and marked so) once its sibling is set.
const rangeFields = [
  {
    key: "elevationMin",
    siblingKey: "elevationMax",
    label: m.field_elevation_min,
    requiredMessage: m.field_elevation_min_required,
  },
  {
    key: "elevationMax",
    siblingKey: "elevationMin",
    label: m.field_elevation_max,
    requiredMessage: m.field_elevation_max_required,
  },
] as const;

// Area coordinates: the four bounds and the elevation range.
export function LocationAreaFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {boundFields.map(([name, label]) => (
        <form.AppField key={name} name={name}>
          {(field) => (
            <field.NumberField label={withRequired(label(), required)} />
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
          rangeFields.map(({ key, siblingKey, label, requiredMessage }) => (
            <form.AppField
              key={key}
              name={`location.${key}`}
              validators={{
                onChangeListenTo: [`location.${siblingKey}`],
                onChange: ({ value, fieldApi }) =>
                  elevationIntegerError(value) ??
                  (fieldApi.form.state.values.location[siblingKey] !==
                    undefined && value === undefined
                    ? { message: requiredMessage() }
                    : undefined),
              }}
            >
              {(field) => (
                <field.NumberField
                  label={withRequired(label(), isSet[siblingKey])}
                />
              )}
            </form.AppField>
          ))
        }
      </form.Subscribe>
    </div>
  );
}
