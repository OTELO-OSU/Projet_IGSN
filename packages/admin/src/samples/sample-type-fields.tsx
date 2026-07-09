import { HierarchySelectField } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type";

import { m } from "#/paraglide/messages.js";
import { typeLabel } from "#/samples/type-label.ts";

export function SampleTypeFields() {
  return (
    <HierarchySelectField
      name="typePath"
      choices={SAMPLE_TYPES}
      getLabel={typeLabel}
      rootLabel={`${m.field_type()} *`}
      placeholder={m.type_placeholder()}
      searchPlaceholder={m.type_search_placeholder()}
      emptyText={m.type_empty()}
    />
  );
}
