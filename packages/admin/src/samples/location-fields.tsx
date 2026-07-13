import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { COUNTRIES } from "@projet-igsn/domain/sample/location/country";
import { ELEVATION_UNITS } from "@projet-igsn/domain/sample/location/elevation-unit";
import { LOCATION_TYPES } from "@projet-igsn/domain/sample/location/location-type";
import { NAVIGATION_TYPES } from "@projet-igsn/domain/sample/location/navigation-type";
import { OCEAN_SEAS } from "@projet-igsn/domain/sample/location/ocean-sea";
import { VERTICAL_DATUMS } from "@projet-igsn/domain/sample/location/vertical-datum";

import { m } from "#/paraglide/messages.js";
import { type LocationDraft } from "#/samples/compose-location.ts";
import {
  countryName,
  locationTypeLabel,
  oceanSeaName,
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

// The Location tab. Every part is optional and independent (ADR 0014): the
// geometry toggle governs only the coordinate block, while region, navigation
// type and locality stand alone. Render inside a `form.AppForm`. The form store
// holds the flat `location.*` draft; `composeLocation` maps it back on submit.
export function LocationFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { location: LocationDraft },
  });
  return (
    <div className="grid gap-6">
      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">
          {m.section_location_position()}
        </h2>
        <form.AppField name="location.type">
          {(field) => (
            <field.ComboboxField
              label={m.field_location_type()}
              items={typeItems}
              placeholder={m.location_type_placeholder()}
              searchPlaceholder={m.location_type_search_placeholder()}
              emptyText={m.location_type_empty()}
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.location.type}>
          {(type) =>
            type === "point" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <form.AppField name="location.longitude">
                  {(field) => <field.NumberField label={m.field_longitude()} />}
                </form.AppField>
                <form.AppField name="location.latitude">
                  {(field) => <field.NumberField label={m.field_latitude()} />}
                </form.AppField>
                <form.AppField name="location.elevationValue">
                  {(field) => <field.NumberField label={m.field_elevation()} />}
                </form.AppField>
              </div>
            ) : type === "area" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <form.AppField name="location.westLongitude">
                  {(field) => (
                    <field.NumberField label={m.field_west_longitude()} />
                  )}
                </form.AppField>
                <form.AppField name="location.eastLongitude">
                  {(field) => (
                    <field.NumberField label={m.field_east_longitude()} />
                  )}
                </form.AppField>
                <form.AppField name="location.southLatitude">
                  {(field) => (
                    <field.NumberField label={m.field_south_latitude()} />
                  )}
                </form.AppField>
                <form.AppField name="location.northLatitude">
                  {(field) => (
                    <field.NumberField label={m.field_north_latitude()} />
                  )}
                </form.AppField>
                <form.AppField name="location.elevationMin">
                  {(field) => (
                    <field.NumberField label={m.field_elevation_min()} />
                  )}
                </form.AppField>
                <form.AppField name="location.elevationMax">
                  {(field) => (
                    <field.NumberField label={m.field_elevation_max()} />
                  )}
                </form.AppField>
              </div>
            ) : null
          }
        </form.Subscribe>

        <form.Subscribe selector={(state) => state.values.location.type}>
          {(type) =>
            type ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <form.AppField name="location.elevationUnit">
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_elevation_unit()}
                      items={unitItems}
                      placeholder={m.elevation_unit_placeholder()}
                      searchPlaceholder={m.elevation_unit_search_placeholder()}
                      emptyText={m.elevation_unit_empty()}
                    />
                  )}
                </form.AppField>
                <form.AppField name="location.elevationDatum">
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_vertical_datum()}
                      items={datumItems}
                      placeholder={m.vertical_datum_placeholder()}
                      searchPlaceholder={m.vertical_datum_search_placeholder()}
                      emptyText={m.vertical_datum_empty()}
                    />
                  )}
                </form.AppField>
              </div>
            ) : null
          }
        </form.Subscribe>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">{m.section_location_region()}</h2>
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
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">
          {m.section_location_context()}
        </h2>
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
        <form.AppField name="location.localityName">
          {(field) => <field.TextField label={m.field_locality_name()} />}
        </form.AppField>
        <form.AppField name="location.localityDescription">
          {(field) => (
            <field.TextField label={m.field_locality_description()} multiline />
          )}
        </form.AppField>
      </section>
    </div>
  );
}
