import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { materialHierarchyFor } from "@projet-igsn/domain/sample/material/hierarchy-for-type";
import { fabricsFor } from "@projet-igsn/domain/sample/metamorphic-fabric/vocabulary";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { materialPathLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function MaterialField() {
  const form = useSampleForm();
  return (
    <>
      <form.AppField
        name="materialPath"
        listeners={{
          onChange: ({ value }) => {
            const {
              texture,
              metamorphicFacies,
              metamorphicFabric,
              description,
              syntheticDetails,
              parentIds,
            } = form.state.values;
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
            if (
              isSyntheticMaterial(material) &&
              parentIds.length === 0 &&
              description.collectionDateStart &&
              !syntheticDetails.synthesisDateStart
            ) {
              form.setFieldValue("syntheticDetails", {
                ...syntheticDetails,
                synthesisDateStart: description.collectionDateStart,
                synthesisDateEnd: description.collectionDateEnd,
                synthesisDatePrecision: description.collectionDatePrecision,
                synthesisDateTimeZone: description.collectionDateTimeZone,
              });
            }
          },
        }}
      >
        {(field) => (
          <form.Subscribe
            selector={(state) => composeHierarchyValue(state.values.typePath)}
          >
            {(type) => (
              <field.HierarchyField
                label={m.field_material()}
                hierarchy={materialHierarchyFor(type)}
                translate={materialPathLabel}
                placeholder={m.material_placeholder()}
                searchPlaceholder={m.material_search_placeholder()}
                emptyText={m.material_empty()}
                {...HIERARCHY_FIELD_LABELS}
              />
            )}
          </form.Subscribe>
        )}
      </form.AppField>
    </>
  );
}
