import { ELEVATION_UNITS } from "@projet-igsn/domain/sample/location/elevation-unit";
import { VERTICAL_DATUMS } from "@projet-igsn/domain/sample/location/vertical-datum";

import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";
import { verticalDatumLabel } from "#/samples/location-label.ts";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

// Elevation units are language-neutral symbols (their own label).
const unitItems = ELEVATION_UNITS.map((value) => ({ value, label: value }));
const datumItems = VERTICAL_DATUMS.map((value) => ({
  value,
  label: verticalDatumLabel(value),
}));

// An elevation value is meaningless without its unit and datum, so both are
// required as soon as a value is entered, even in a draft (ADR 0014). Scoped to
// the visible value field so a stale value from the other geometry never counts.
const isElevationEntered = (location: LocationDraft): boolean =>
  location.type === "point"
    ? location.elevationValue !== undefined
    : location.type === "area"
      ? location.elevationMin !== undefined ||
        location.elevationMax !== undefined
      : false;

// Unit and datum share one rule: each is required once an elevation value is
// entered. The validators stay inline (TanStack types onChange per field name);
// this is just the shared body they both call.
const elevationRequired = (
  value: string,
  location: LocationDraft,
  message: () => string,
) =>
  isElevationEntered(location) && !value ? { message: message() } : undefined;

// Elevation unit and vertical datum, shown once a geometry is chosen and
// enabled (and required) once an elevation value is entered. A unit/datum left
// behind by an emptied elevation is harmless: the fields disable and
// composeLocation drops them without a value.
export function LocationElevationFields() {
  const form = useLocationForm();
  return (
    <form.Subscribe
      selector={(state) => ({
        show: Boolean(state.values.location.type),
        required: isElevationEntered(state.values.location),
      })}
    >
      {({ show, required }) =>
        show ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <form.AppField
              name="location.elevationUnit"
              validators={{
                onChangeListenTo: [
                  "location.elevationValue",
                  "location.elevationMin",
                  "location.elevationMax",
                ],
                onChange: ({ value, fieldApi }) =>
                  elevationRequired(
                    value,
                    fieldApi.form.state.values.location,
                    m.field_elevation_unit_required,
                  ),
              }}
            >
              {(field) => (
                <field.ComboboxField
                  label={withRequired(m.field_elevation_unit(), required)}
                  items={unitItems}
                  placeholder={m.elevation_unit_placeholder()}
                  searchPlaceholder={m.elevation_unit_search_placeholder()}
                  emptyText={m.elevation_unit_empty()}
                  disabled={!required}
                />
              )}
            </form.AppField>
            <form.AppField
              name="location.elevationDatum"
              validators={{
                onChangeListenTo: [
                  "location.elevationValue",
                  "location.elevationMin",
                  "location.elevationMax",
                ],
                onChange: ({ value, fieldApi }) =>
                  elevationRequired(
                    value,
                    fieldApi.form.state.values.location,
                    m.field_vertical_datum_required,
                  ),
              }}
            >
              {(field) => (
                <field.ComboboxField
                  label={withRequired(m.field_vertical_datum(), required)}
                  items={datumItems}
                  placeholder={m.vertical_datum_placeholder()}
                  searchPlaceholder={m.vertical_datum_search_placeholder()}
                  emptyText={m.vertical_datum_empty()}
                  disabled={!required}
                />
              )}
            </form.AppField>
          </div>
        ) : null
      }
    </form.Subscribe>
  );
}
