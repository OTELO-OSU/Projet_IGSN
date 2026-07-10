import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import {
  composeHierarchyValue,
  HierarchySelectField,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { materialPathLabel } from "#/samples/vocabulary-label.ts";

// Material shares the generic hierarchy cascade with type and collection method;
// the tree itself carries the completeness policy (a node with children must be
// refined unless marked `optional: true`), so an ancestor like "rock" offers
// only its children.
export function MaterialField() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { materialPath: string[]; texture: string },
  });
  return (
    <HierarchySelectField
      name="materialPath"
      hierarchy={MATERIAL_HIERARCHY}
      translate={materialPathLabel}
      rootLabel={`${m.field_material()} *`}
      placeholder={m.material_placeholder()}
      searchPlaceholder={m.material_search_placeholder()}
      emptyText={m.material_empty()}
      // Texture depends on the plutonic/volcanic branch, so drop it only when it
      // no longer applies to the new path (branch switch or leaving igneous),
      // not when refining deeper within the same branch (see TextureField).
      onChange={() => {
        const { materialPath, texture } = form.state.values;
        const textures: readonly string[] = texturesFor(
          composeHierarchyValue(materialPath ?? []),
        );
        if (texture && !textures.includes(texture)) {
          form.setFieldValue("texture", "");
        }
      }}
    />
  );
}
