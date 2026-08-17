import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { ELEVATION_UNITS } from "@projet-igsn/domain/sample/location/elevation-unit";
import { VERTICAL_DATUMS } from "@projet-igsn/domain/sample/location/vertical-datum";

import { m } from "#/paraglide/messages.js";
import { isElevationEntered } from "#/samples/compose-location.ts";
import { verticalDatumLabel } from "#/samples/location-label.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const metaFields = [
  {
    key: "elevationUnit" as const,
    items: toComboboxItems(ELEVATION_UNITS, (value) => value),
    label: m.field_elevation_unit,
    placeholder: m.elevation_unit_placeholder,
    searchPlaceholder: m.elevation_unit_search_placeholder,
    emptyText: m.elevation_unit_empty,
  },
  {
    key: "elevationDatum" as const,
    items: toComboboxItems(VERTICAL_DATUMS, verticalDatumLabel),
    label: m.field_vertical_datum,
    placeholder: m.vertical_datum_placeholder,
    searchPlaceholder: m.vertical_datum_search_placeholder,
    emptyText: m.vertical_datum_empty,
  },
];

export function LocationElevationFields() {
  const form = useSampleForm();
  return (
    <form.Subscribe
      selector={(state) => isElevationEntered(state.values.location)}
    >
      {(entered) =>
        entered
          ? metaFields.map(
              ({
                key,
                items,
                label,
                placeholder,
                searchPlaceholder,
                emptyText,
              }) => (
                <form.AppField key={key} name={`location.${key}`}>
                  {(field) => (
                    <field.ComboboxField
                      label={label()}
                      requiredToPublish
                      items={items}
                      placeholder={placeholder()}
                      searchPlaceholder={searchPlaceholder()}
                      emptyText={emptyText()}
                    />
                  )}
                </form.AppField>
              ),
            )
          : null
      }
    </form.Subscribe>
  );
}
