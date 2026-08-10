import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";

import { m } from "#/paraglide/messages.js";
import { metamorphicFaciesLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

// Metamorphic facies selector: shown only when the chosen material is
// metamorphic (the vocabulary that applies then), which is exactly when the
// facies is required to publish, hence the static "*" marker.
export function MetamorphicFaciesField() {
  const form = useSampleForm();
  return (
    <form.Subscribe selector={(state) => state.values.materialPath}>
      {(materialPath) => {
        const facies = faciesFor(composeHierarchyValue(materialPath ?? []));
        if (facies.length === 0) return null;
        const items = toComboboxItems(facies, metamorphicFaciesLabel);
        return (
          <form.AppField name="metamorphicFacies">
            {(field) => (
              <field.ComboboxField
                label={m.field_metamorphic_facies()}
                requiredToPublish
                items={items}
                placeholder={m.metamorphic_facies_placeholder()}
                searchPlaceholder={m.metamorphic_facies_search_placeholder()}
                emptyText={m.metamorphic_facies_empty()}
              />
            )}
          </form.AppField>
        );
      }}
    </form.Subscribe>
  );
}
