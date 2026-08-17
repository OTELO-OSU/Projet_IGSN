import {
  composeHierarchyValue,
  HierarchySelectField,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { materialPathLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function MaterialField() {
  const form = useSampleForm();
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
      onChange={() => {
        const { materialPath, texture, metamorphicFacies } = form.state.values;
        const material = composeHierarchyValue(materialPath ?? []);
        const textures: readonly string[] = texturesFor(material);
        if (texture && !textures.includes(texture)) {
          form.setFieldValue("texture", undefined);
        }
        const facies: readonly string[] = faciesFor(material);
        if (metamorphicFacies && !facies.includes(metamorphicFacies)) {
          form.setFieldValue("metamorphicFacies", undefined);
        }
      }}
    />
  );
}
