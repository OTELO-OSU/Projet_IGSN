import { HierarchySelectField } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { MATERIAL_HIERARCHY } from "@projet-igsn/domain/sample/material/classification";

import { m } from "#/paraglide/messages.js";
import { materialPathLabel } from "#/samples/material-path-label.ts";

// Material shares the generic hierarchy cascade with type and collection method;
// the tree itself carries the completeness policy (`optional: false` marks a
// node that must be refined), so an ancestor like "rock" offers only its children.
export function MaterialField() {
  return (
    <HierarchySelectField
      name="materialPath"
      hierarchy={MATERIAL_HIERARCHY}
      getLabel={materialPathLabel}
      rootLabel={`${m.field_material()} *`}
      placeholder={m.material_placeholder()}
      searchPlaceholder={m.material_search_placeholder()}
      emptyText={m.material_empty()}
    />
  );
}
