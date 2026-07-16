import { ELEVATION_UNITS } from "@projet-igsn/domain/sample/location/elevation-unit";
import { VERTICAL_DATUMS } from "@projet-igsn/domain/sample/location/vertical-datum";

import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";
import { verticalDatumLabel } from "#/samples/location-label.ts";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

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

const metaFields = [
  {
    key: "elevationUnit" as const,
    // Elevation units are language-neutral symbols (their own label).
    items: ELEVATION_UNITS.map((value) => ({ value, label: value })),
    label: m.field_elevation_unit,
    requiredMessage: m.field_elevation_unit_required,
    placeholder: m.elevation_unit_placeholder,
    searchPlaceholder: m.elevation_unit_search_placeholder,
    emptyText: m.elevation_unit_empty,
  },
  {
    key: "elevationDatum" as const,
    items: VERTICAL_DATUMS.map((value) => ({
      value,
      label: verticalDatumLabel(value),
    })),
    label: m.field_vertical_datum,
    requiredMessage: m.field_vertical_datum_required,
    placeholder: m.vertical_datum_placeholder,
    searchPlaceholder: m.vertical_datum_search_placeholder,
    emptyText: m.vertical_datum_empty,
  },
];

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
            {metaFields.map(
              ({
                key,
                items,
                label,
                requiredMessage,
                placeholder,
                searchPlaceholder,
                emptyText,
              }) => (
                <form.AppField
                  key={key}
                  name={`location.${key}`}
                  validators={{
                    onChangeListenTo: [
                      "location.elevationValue",
                      "location.elevationMin",
                      "location.elevationMax",
                    ],
                    onChange: ({ value, fieldApi }) =>
                      isElevationEntered(fieldApi.form.state.values.location) &&
                      !value
                        ? { message: requiredMessage() }
                        : undefined,
                  }}
                >
                  {(field) => (
                    <field.ComboboxField
                      label={withRequired(label(), required)}
                      items={items}
                      placeholder={placeholder()}
                      searchPlaceholder={searchPlaceholder()}
                      emptyText={emptyText()}
                      disabled={!required}
                    />
                  )}
                </form.AppField>
              ),
            )}
          </div>
        ) : null
      }
    </form.Subscribe>
  );
}
