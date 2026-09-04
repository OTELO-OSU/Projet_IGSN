import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { METAMORPHIC_FACIES } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";

import { m } from "#/paraglide/messages.js";
import { metamorphicFaciesLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const items = toComboboxItems(METAMORPHIC_FACIES, metamorphicFaciesLabel);

export function MetamorphicFaciesField() {
  const form = useSampleForm();
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
}
