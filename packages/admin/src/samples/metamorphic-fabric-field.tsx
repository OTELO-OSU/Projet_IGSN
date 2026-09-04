import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { fabricsFor } from "@projet-igsn/domain/sample/metamorphic-fabric/vocabulary";

import { m } from "#/paraglide/messages.js";
import { metamorphicFabricLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function MetamorphicFabricField() {
  const form = useSampleForm();
  return (
    <form.Subscribe selector={(state) => state.values.materialPath}>
      {(materialPath) => {
        const fabrics = fabricsFor(composeHierarchyValue(materialPath ?? []));
        if (fabrics.length === 0) return null;
        const items = toComboboxItems(fabrics, metamorphicFabricLabel);
        return (
          <form.AppField name="metamorphicFabric">
            {(field) => (
              <field.ComboboxField
                label={m.field_metamorphic_fabric()}
                items={items}
                placeholder={m.metamorphic_fabric_placeholder()}
                searchPlaceholder={m.metamorphic_fabric_search_placeholder()}
                emptyText={m.metamorphic_fabric_empty()}
              />
            )}
          </form.AppField>
        );
      }}
    </form.Subscribe>
  );
}
