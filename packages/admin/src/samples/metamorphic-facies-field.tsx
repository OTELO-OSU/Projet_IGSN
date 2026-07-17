import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";

import { m } from "#/paraglide/messages.js";
import { metamorphicFaciesLabel } from "#/samples/sample-labels.ts";

// Metamorphic facies selector: shown only when the chosen material is
// metamorphic (the vocabulary that applies then), which is exactly when the
// facies is required to publish, hence the static "*" marker. The material
// field resets this value when the material changes, so a stale facies never
// survives a switch away from a metamorphic material. Render inside a
// `form.AppForm`.
export function MetamorphicFaciesField() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { materialPath: string[]; metamorphicFacies: string },
  });
  return (
    <form.Subscribe selector={(state) => state.values.materialPath}>
      {(materialPath) => {
        const facies = faciesFor(composeHierarchyValue(materialPath ?? []));
        if (facies.length === 0) return null;
        const items = facies.map((code) => ({
          value: code,
          label: metamorphicFaciesLabel(code),
        }));
        return (
          <form.AppField name="metamorphicFacies">
            {(field) => (
              <field.ComboboxField
                label={`${m.field_metamorphic_facies()} *`}
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
