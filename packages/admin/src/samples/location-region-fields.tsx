import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { COUNTRIES } from "@projet-igsn/domain/sample/location/country";
import { OCEAN_SEAS } from "@projet-igsn/domain/sample/location/ocean-sea";
import { oceanSeaName } from "@projet-igsn/domain/sample/location/ocean-sea-label";

import { m } from "#/paraglide/messages.js";
import { countryName, regionKindLabel } from "#/samples/location-label.ts";
import { useLocationForm } from "#/samples/use-location-form.ts";

const regionKindItems = toComboboxItems(
  ["continent", "ocean"] as const,
  regionKindLabel,
);
const countryItems = toComboboxItems(COUNTRIES, countryName);
const oceanSeaItems = toComboboxItems(OCEAN_SEAS, oceanSeaName);

// Region: a continent/ocean toggle, then the matching country or ocean/sea list.
export function LocationRegionFields() {
  const form = useLocationForm();
  return (
    <>
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
    </>
  );
}
