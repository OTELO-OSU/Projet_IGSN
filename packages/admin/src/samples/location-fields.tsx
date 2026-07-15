import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { COUNTRIES } from "@projet-igsn/domain/sample/location/country";
import { ELEVATION_UNITS } from "@projet-igsn/domain/sample/location/elevation-unit";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";
import { LOCATION_TYPES } from "@projet-igsn/domain/sample/location/location-type";
import { NAVIGATION_TYPES } from "@projet-igsn/domain/sample/location/navigation-type";
import { OCEAN_SEAS } from "@projet-igsn/domain/sample/location/ocean-sea";
import { oceanSeaName } from "@projet-igsn/domain/sample/location/ocean-sea-label";
import { VERTICAL_DATUMS } from "@projet-igsn/domain/sample/location/vertical-datum";

import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";
import {
  countryName,
  locationTypeLabel,
  regionKindLabel,
  verticalDatumLabel,
} from "#/samples/location-label.ts";

const typeItems = LOCATION_TYPES.map((value) => ({
  value,
  label: locationTypeLabel(value),
}));
// Elevation units and navigation types are language-neutral codes (their own
// label); country/ocean-sea are localized name maps.
const unitItems = ELEVATION_UNITS.map((value) => ({ value, label: value }));
const datumItems = VERTICAL_DATUMS.map((value) => ({
  value,
  label: verticalDatumLabel(value),
}));
const regionKindItems = (["continent", "ocean"] as const).map((value) => ({
  value,
  label: regionKindLabel(value),
}));
const countryItems = COUNTRIES.map((value) => ({
  value,
  label: countryName(value),
}));
const oceanSeaItems = OCEAN_SEAS.map((value) => ({
  value,
  label: oceanSeaName(value),
}));
const navigationTypeItems = NAVIGATION_TYPES.map((value) => ({
  value,
  label: value,
}));

// An elevation value is meaningless without its unit and datum, so both are
// required as soon as a value is entered, even in a draft (ADR 0014). Scoped to
// the visible value field so a stale value from the other geometry never counts.
const isElevationEntered = (location: LocationDraft): boolean =>
  location.type === "point"
    ? Boolean(location.elevationValue)
    : location.type === "area"
      ? Boolean(location.elevationMin || location.elevationMax)
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

// Mark a field required with a trailing "*" once the condition holds, matching
// the static "Type *" markers (accessibility rule: required shown in text).
const withRequired = (label: string, required: boolean): string =>
  required ? `${label} *` : label;

// A position (type + coordinates) is required to publish unless the material
// exempts it (returned samples) or forbids it (synthetic); the "*" mirrors the
// location_position_missing publish blocker, so it does not block a draft save.
const isPositionRequired = (materialPath: string[]): boolean =>
  locationRequirement(composeHierarchyValue(materialPath)) === "required";

// The Location tab. Every part is optional and independent (ADR 0014): the
// geometry toggle governs only the coordinate block, while region, navigation
// type and locality stand alone. Render inside a `form.AppForm`. The form store
// holds the flat `location.*` draft; `composeLocation` maps it back on submit.
export function LocationFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { location: LocationDraft; materialPath: string[] },
  });
  // A unit/datum left behind by an emptied elevation is harmless: the fields
  // disable and composeLocation drops them without a value.
  return (
    <div className="grid gap-4">
      <form.Subscribe
        selector={(state) => isPositionRequired(state.values.materialPath)}
      >
        {(required) => (
          <form.AppField name="location.type">
            {(field) => (
              <field.ComboboxField
                label={withRequired(m.field_location_type(), required)}
                items={typeItems}
                placeholder={m.location_type_placeholder()}
                searchPlaceholder={m.location_type_search_placeholder()}
                emptyText={m.location_type_empty()}
              />
            )}
          </form.AppField>
        )}
      </form.Subscribe>

      <form.Subscribe
        selector={(state) => ({
          type: state.values.location.type,
          required: isPositionRequired(state.values.materialPath),
        })}
      >
        {({ type, required }) =>
          type === "point" ? (
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
          ) : type === "area" ? (
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
              {/* An area elevation is a range: setting one bound requires the
                    other, so each is marked required once its sibling is set. */}
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
                          fieldApi.form.state.values.location.elevationMax &&
                          !value
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
                          fieldApi.form.state.values.location.elevationMin &&
                          !value
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
          ) : null
        }
      </form.Subscribe>

      <form.Subscribe
        selector={(state) => ({
          show: Boolean(state.values.location.type),
          // Unit and datum become required (and marked "*") once a value is set.
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

      {/* Navigation type qualifies how the coordinates were fixed, so it only
            applies once a geometry (point or area) is chosen. */}
      <form.Subscribe selector={(state) => Boolean(state.values.location.type)}>
        {(show) =>
          show ? (
            <form.AppField name="location.navigationType">
              {(field) => (
                <field.ComboboxField
                  label={m.field_navigation_type()}
                  items={navigationTypeItems}
                  placeholder={m.navigation_type_placeholder()}
                  searchPlaceholder={m.navigation_type_search_placeholder()}
                  emptyText={m.navigation_type_empty()}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      <form.AppField name="location.regionKind">
        {(field) => (
          <field.ComboboxField
            label={m.field_region_kind()}
            items={regionKindItems}
            placeholder={m.region_kind_placeholder()}
            searchPlaceholder={m.region_kind_search_placeholder()}
            emptyText={m.region_kind_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values.location.regionKind}>
        {(regionKind) =>
          regionKind === "continent" ? (
            <form.AppField name="location.country">
              {(field) => (
                <field.ComboboxField
                  label={m.field_country()}
                  items={countryItems}
                  placeholder={m.country_placeholder()}
                  searchPlaceholder={m.country_search_placeholder()}
                  emptyText={m.country_empty()}
                />
              )}
            </form.AppField>
          ) : regionKind === "ocean" ? (
            <form.AppField name="location.oceanSea">
              {(field) => (
                <field.ComboboxField
                  label={m.field_ocean_sea()}
                  items={oceanSeaItems}
                  placeholder={m.ocean_sea_placeholder()}
                  searchPlaceholder={m.ocean_sea_search_placeholder()}
                  emptyText={m.ocean_sea_empty()}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      <form.AppField name="location.localityName">
        {(field) => <field.TextField label={m.field_locality_name()} />}
      </form.AppField>
      <form.AppField name="location.localityDescription">
        {(field) => (
          <field.TextField label={m.field_locality_description()} multiline />
        )}
      </form.AppField>
    </div>
  );
}
