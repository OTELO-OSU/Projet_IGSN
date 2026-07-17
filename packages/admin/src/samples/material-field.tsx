import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import {
  composeHierarchyValue,
  HierarchySelectField,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { materialPathLabel } from "#/samples/sample-labels.ts";

// Material shares the generic hierarchy cascade with type and collection method;
// the tree itself carries the completeness policy (a node with children must be
// refined unless marked `optional: true`), so an ancestor like "rock" offers
// only its children.
export function MaterialField() {
  const form = useTypedAppFormContext({
    defaultValues: {} as {
      materialPath: string[];
      texture: string;
      metamorphicFacies: string;
    },
  });
  return (
    <HierarchySelectField
      name="materialPath"
      hierarchy={MATERIAL_HIERARCHY}
      translate={materialPathLabel}
      rootLabel={m.field_material()}
      requiredToPublish
      placeholder={m.material_placeholder()}
      searchPlaceholder={m.material_search_placeholder()}
      emptyText={m.material_empty()}
      // Texture and metamorphic facies depend on the material branch, so drop
      // each only when it no longer applies to the new path (branch switch or
      // leaving igneous/metamorphic), not when refining deeper within the same
      // branch (see TextureField / MetamorphicFaciesField).
      onChange={() => {
        const { materialPath, texture, metamorphicFacies } = form.state.values;
        const material = composeHierarchyValue(materialPath ?? []);
        const textures: readonly string[] = texturesFor(material);
        if (texture && !textures.includes(texture)) {
          form.setFieldValue("texture", "");
        }
        const facies: readonly string[] = faciesFor(material);
        if (metamorphicFacies && !facies.includes(metamorphicFacies)) {
          form.setFieldValue("metamorphicFacies", "");
        }
      }}
    />
  );
}
