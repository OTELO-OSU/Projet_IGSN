import { m } from "#/paraglide/messages.js";
import { elevationIntegerError } from "#/samples/elevation-integer-error.ts";
import { LocationElevationFields } from "#/samples/location-elevation-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

const boundFields = [
  ["location.westLongitude", m.field_west_longitude],
  ["location.eastLongitude", m.field_east_longitude],
  ["location.southLatitude", m.field_south_latitude],
  ["location.northLatitude", m.field_north_latitude],
] as const;

// An area elevation is a range: a range needs both bounds, so each bound is
// marked required with a "*" once its sibling is set. The "*" is a hint only,
// since a half-entered range gates publish, not the draft (publish blocker
// elevation_range_incomplete; ADR 0014).
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

// Area coordinates: the four bounds (two per row), then the elevation range
// sharing its row with the unit/datum fields (min/max/unit/datum, 1/1/1/1).
export function LocationAreaFields({ required }: { required: boolean }) {
  const form = useLocationForm();
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {boundFields.map(([name, label]) => (
        <div key={name} className="sm:col-span-2">
          <form.AppField name={name}>
            {(field) => (
              <field.NumberField label={withRequired(label(), required)} />
            )}
          </form.AppField>
        </div>
      ))}
      <form.Subscribe
        selector={(state) => ({
          elevationMin: state.values.location.elevationMin !== undefined,
          elevationMax: state.values.location.elevationMax !== undefined,
        })}
      >
        {(isSet) =>
          rangeFields.map(({ key, siblingKey, label }) => (
            <form.AppField
              key={key}
              name={`location.${key}`}
              validators={{
                onChange: ({ value }) => elevationIntegerError(value),
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
      <LocationElevationFields />
    </div>
  );
}
