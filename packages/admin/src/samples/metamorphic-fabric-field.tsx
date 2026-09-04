import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { METAMORPHIC_FABRICS } from "@projet-igsn/domain/sample/metamorphic-fabric/vocabulary";

import { m } from "#/paraglide/messages.js";
import { metamorphicFabricLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const items = toComboboxItems(METAMORPHIC_FABRICS, metamorphicFabricLabel);

export function MetamorphicFabricField() {
  const form = useSampleForm();
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
}
