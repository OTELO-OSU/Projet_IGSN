import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { LOCATION_TYPES } from "@projet-igsn/domain/sample/location/location-type";

import { m } from "#/paraglide/messages.js";
import { locationTypeLabel } from "#/samples/location-label.ts";
import { LocationNavigationTypeField } from "#/samples/location-navigation-type-field.tsx";
import { LocationPositionFields } from "#/samples/location-position-fields.tsx";
import { LocationRegionFields } from "#/samples/location-region-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const typeItems = toComboboxItems(LOCATION_TYPES, locationTypeLabel);

export function LocationFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.AppField name="location.type">
        {(field) => (
          <field.ComboboxField
            label={m.field_location_type()}
            requiredToPublish
            items={typeItems}
            placeholder={m.location_type_placeholder()}
            searchPlaceholder={m.location_type_search_placeholder()}
            emptyText={m.location_type_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values.location.type}>
        {(type) => (type ? <LocationPositionFields type={type} /> : null)}
      </form.Subscribe>

      <LocationNavigationTypeField />
      <LocationRegionFields />

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
