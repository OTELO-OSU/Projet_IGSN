import { SAMPLE_TYPE_HIERARCHY } from "@projet-igsn/domain/sample/type/vocabulary";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { typeLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleTypeFields() {
  const form = useSampleForm();
  return (
    <form.AppField name="typePath">
      {(field) => (
        <field.HierarchyField
          label={m.field_type()}
          hierarchy={SAMPLE_TYPE_HIERARCHY}
          translate={typeLabel}
          requiredToPublish
          placeholder={m.type_placeholder()}
          searchPlaceholder={m.type_search_placeholder()}
          emptyText={m.type_empty()}
          {...HIERARCHY_FIELD_LABELS}
        />
      )}
    </form.AppField>
  );
}
