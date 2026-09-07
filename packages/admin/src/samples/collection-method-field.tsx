import { COLLECTION_METHOD_HIERARCHY } from "@projet-igsn/domain/sample/collection-method/vocabulary";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { collectionMethodLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function CollectionMethodField() {
  const form = useSampleForm();
  return (
    <form.AppField name="collectionMethodPath">
      {(field) => (
        <field.HierarchyField
          label={m.field_collection_method()}
          hierarchy={COLLECTION_METHOD_HIERARCHY}
          translate={collectionMethodLabel}
          placeholder={m.collection_method_placeholder()}
          searchPlaceholder={m.collection_method_search_placeholder()}
          emptyText={m.collection_method_empty()}
          {...HIERARCHY_FIELD_LABELS}
        />
      )}
    </form.AppField>
  );
}
