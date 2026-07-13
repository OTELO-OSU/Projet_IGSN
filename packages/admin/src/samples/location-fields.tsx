import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";
import { LOCATION_TYPES } from "@projet-igsn/domain/sample/location/location-type";

import { m } from "#/paraglide/messages.js";
import { LocationAreaFields } from "#/samples/location-area-fields.tsx";
import { locationTypeLabel } from "#/samples/location-label.ts";
import { LocationNavigationTypeField } from "#/samples/location-navigation-type-field.tsx";
import { LocationPointFields } from "#/samples/location-point-fields.tsx";
import { LocationRegionFields } from "#/samples/location-region-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";
import { withRequired } from "#/samples/with-required.ts";

const typeItems = LOCATION_TYPES.map((value) => ({
  value,
  label: locationTypeLabel(value),
}));

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
  const form = useLocationForm();
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
            <LocationPointFields required={required} />
          ) : type === "area" ? (
            <LocationAreaFields required={required} />
          ) : null
        }
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
