import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";
import { fabricsFor } from "@projet-igsn/domain/sample/metamorphic-fabric/vocabulary";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { materialPathLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function MaterialField() {
  const form = useSampleForm();
  return (
    <form.AppField
      name="materialPath"
      listeners={{
        onChange: ({ value }) => {
          const { texture, metamorphicFacies, metamorphicFabric } =
            form.state.values;
          const material = composeHierarchyValue(value);
          const textures: readonly string[] = texturesFor(material);
          if (texture && !textures.includes(texture)) {
            form.setFieldValue("texture", undefined);
          }
          const facies: readonly string[] = faciesFor(material);
          if (metamorphicFacies && !facies.includes(metamorphicFacies)) {
            form.setFieldValue("metamorphicFacies", undefined);
          }
          const fabrics: readonly string[] = fabricsFor(material);
          if (metamorphicFabric && !fabrics.includes(metamorphicFabric)) {
            form.setFieldValue("metamorphicFabric", undefined);
          }
        },
      }}
    >
      {(field) => (
        <field.HierarchyField
          label={m.field_material()}
          hierarchy={MATERIAL_HIERARCHY}
          translate={materialPathLabel}
          requiredToPublish
          placeholder={m.material_placeholder()}
          searchPlaceholder={m.material_search_placeholder()}
          emptyText={m.material_empty()}
          {...HIERARCHY_FIELD_LABELS}
        />
      )}
    </form.AppField>
  );
}
