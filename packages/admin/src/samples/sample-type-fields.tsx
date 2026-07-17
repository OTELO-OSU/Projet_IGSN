import { HierarchySelectField } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { SAMPLE_TYPE_HIERARCHY } from "@projet-igsn/domain/sample/type/vocabulary";

import { m } from "#/paraglide/messages.js";
import { typeLabel } from "#/samples/sample-labels.ts";

export function SampleTypeFields() {
  return (
    <HierarchySelectField
      name="typePath"
      hierarchy={SAMPLE_TYPE_HIERARCHY}
      translate={typeLabel}
      rootLabel={withRequired(m.field_type(), true)}
      placeholder={m.type_placeholder()}
      searchPlaceholder={m.type_search_placeholder()}
      emptyText={m.type_empty()}
    />
  );
}
