import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { isMetamorphicRock } from "@projet-igsn/domain/sample/material/is-metamorphic-rock";

import { MetamorphicFabricField } from "#/samples/metamorphic-fabric-field.tsx";
import { MetamorphicFaciesField } from "#/samples/metamorphic-facies-field.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function MetamorphicDetails() {
  const form = useSampleForm();
  return (
    <form.Subscribe selector={(state) => state.values.materialPath}>
      {(materialPath) =>
        isMetamorphicRock(composeHierarchyValue(materialPath ?? [])) ? (
          <>
            <MetamorphicFaciesField />
            <MetamorphicFabricField />
          </>
        ) : null
      }
    </form.Subscribe>
  );
}
