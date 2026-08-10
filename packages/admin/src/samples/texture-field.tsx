import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { textureLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function TextureField() {
  const form = useSampleForm();
  return (
    <form.Subscribe selector={(state) => state.values.materialPath}>
      {(materialPath) => {
        const textures = texturesFor(composeHierarchyValue(materialPath ?? []));
        if (textures.length === 0) return null;
        const items = toComboboxItems(textures, textureLabel);
        return (
          <form.AppField name="texture">
            {(field) => (
              <field.ComboboxField
                label={m.field_texture()}
                items={items}
                placeholder={m.texture_placeholder()}
                searchPlaceholder={m.texture_search_placeholder()}
                emptyText={m.texture_empty()}
              />
            )}
          </form.AppField>
        );
      }}
    </form.Subscribe>
  );
}
