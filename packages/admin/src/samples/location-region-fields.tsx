import { REGION_HIERARCHY } from "@projet-igsn/domain/sample/location/region";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { regionPathLabel } from "#/samples/location-label.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function LocationRegionFields() {
  const form = useSampleForm();
  return (
    <form.AppField name="location.regionPath">
      {(field) => (
        <field.HierarchyField
          label={m.field_region()}
          hierarchy={REGION_HIERARCHY}
          translate={regionPathLabel}
          placeholder={m.region_placeholder()}
          searchPlaceholder={m.region_search_placeholder()}
          emptyText={m.region_empty()}
          {...HIERARCHY_FIELD_LABELS}
        />
      )}
    </form.AppField>
  );
}
