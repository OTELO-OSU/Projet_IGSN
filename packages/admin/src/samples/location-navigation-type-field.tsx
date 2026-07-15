import { NAVIGATION_TYPES } from "@projet-igsn/domain/sample/location/navigation-type";

import { m } from "#/paraglide/messages.js";
import { useLocationForm } from "#/samples/use-location-form.ts";

// Navigation types are language-neutral codes (their own label).
const navigationTypeItems = NAVIGATION_TYPES.map((value) => ({
  value,
  label: value,
}));

// Navigation type qualifies how the coordinates were fixed, so it only applies
// once a geometry (point or area) is chosen.
export function LocationNavigationTypeField() {
  const form = useLocationForm();
  return (
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
  );
}
