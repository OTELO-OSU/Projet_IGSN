import { GEOMORPHOLOGICAL_ENVIRONMENT_HIERARCHY } from "@projet-igsn/domain/sample/geomorphological-environment/vocabulary";

import { m } from "#/paraglide/messages.js";
import { HIERARCHY_FIELD_LABELS } from "#/samples/hierarchy-field-labels.ts";
import { geomorphologicalEnvironmentLabel } from "#/samples/sample-labels.ts";
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

      <form.AppField name="geomorphologicalEnvironmentPath">
        {(field) => (
          <field.HierarchyField
            label={m.field_environment()}
            hierarchy={GEOMORPHOLOGICAL_ENVIRONMENT_HIERARCHY}
            translate={geomorphologicalEnvironmentLabel}
            placeholder={m.environment_placeholder()}
            searchPlaceholder={m.environment_search_placeholder()}
            emptyText={m.environment_empty()}
            {...HIERARCHY_FIELD_LABELS}
          />
        )}
      </form.AppField>
    </div>
  );
}
