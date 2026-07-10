import { HierarchySelectField } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { COLLECTION_METHOD_HIERARCHY } from "@projet-igsn/domain/sample/collection-method/vocabulary";

import { m } from "#/paraglide/messages.js";
import { collectionMethodLabel } from "#/samples/vocabulary-label.ts";

export function CollectionMethodField() {
  return (
    <HierarchySelectField
      name="collectionMethodPath"
      hierarchy={COLLECTION_METHOD_HIERARCHY}
      translate={collectionMethodLabel}
      rootLabel={m.field_collection_method()}
      placeholder={m.collection_method_placeholder()}
      searchPlaceholder={m.collection_method_search_placeholder()}
      emptyText={m.collection_method_empty()}
    />
  );
}
