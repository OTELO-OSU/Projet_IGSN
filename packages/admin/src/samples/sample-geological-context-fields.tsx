import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { HierarchySelectField } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { GEOMORPHOLOGICAL_ENVIRONMENT_HIERARCHY } from "@projet-igsn/domain/sample/geomorphological-environment/vocabulary";

import { m } from "#/paraglide/messages.js";
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

      <FormSection level={3} title={m.section_geomorphological_context()}>
        <HierarchySelectField
          name="geomorphologicalEnvironmentPath"
          hierarchy={GEOMORPHOLOGICAL_ENVIRONMENT_HIERARCHY}
          translate={geomorphologicalEnvironmentLabel}
          rootLabel={m.field_environment()}
          placeholder={m.environment_placeholder()}
          searchPlaceholder={m.environment_search_placeholder()}
          emptyText={m.environment_empty()}
        />
      </FormSection>
    </div>
  );
}
