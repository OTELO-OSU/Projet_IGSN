import { PHYSIOGRAPHIC_ENVIRONMENT_HIERARCHY } from "@projet-igsn/domain/sample/physiographic-environment/vocabulary";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { physiographicEnvironmentLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleGeologicalContextFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.AppField name="geologicalContextDescription">
        {(field) => (
          <field.TextField
            label={m.field_geological_context_description()}
            multiline
          />
        )}
      </form.AppField>

      <form.AppField name="physiographicEnvironmentPath">
        {(field) => (
          <field.HierarchyField
            label={m.field_physiographic_environment()}
            hierarchy={PHYSIOGRAPHIC_ENVIRONMENT_HIERARCHY}
            translate={physiographicEnvironmentLabel}
            placeholder={m.physiographic_environment_placeholder()}
            searchPlaceholder={m.physiographic_environment_search_placeholder()}
            emptyText={m.physiographic_environment_empty()}
            {...HIERARCHY_FIELD_LABELS}
          />
        )}
      </form.AppField>
    </div>
  );
}
