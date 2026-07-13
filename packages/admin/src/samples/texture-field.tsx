import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { textureLabel } from "#/samples/sample-labels.ts";

// Igneous texture selector: shown only when the chosen material is a plutonic or
// volcanic branch (the vocabulary that applies then). The material field resets
// this value when the material changes, so a stale texture never survives a
// branch switch. Render inside a `form.AppForm`.
export function TextureField() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { materialPath: string[]; texture: string },
  });
  return (
    <form.Subscribe selector={(state) => state.values.materialPath}>
      {(materialPath) => {
        const textures = texturesFor(composeHierarchyValue(materialPath ?? []));
        if (textures.length === 0) return null;
        const items = textures.map((texture) => ({
          value: texture,
          label: textureLabel(texture),
        }));
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
