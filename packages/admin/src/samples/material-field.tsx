import { HierarchySelectField } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { materialHierarchy } from "@projet-igsn/domain/sample/material/hierarchy";

import { m } from "#/paraglide/messages.js";
import { materialPathLabel } from "#/samples/material-path-label.ts";

// Material shares the generic hierarchy cascade with type and collection method;
// its completeness policy (a node may stop unless it must be refined) rides in
// materialHierarchy so an ancestor like "rock" keeps offering only its children.
export function MaterialField() {
  return (
    <HierarchySelectField
      name="materialPath"
      hierarchy={materialHierarchy}
      getLabel={materialPathLabel}
      rootLabel={`${m.field_material()} *`}
      placeholder={m.material_placeholder()}
      searchPlaceholder={m.material_search_placeholder()}
      emptyText={m.material_empty()}
    />
  );
}
