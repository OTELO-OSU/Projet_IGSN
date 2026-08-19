import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";

import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleManualGroupsField({
  options,
}: {
  options: ManualGroup[];
}) {
  const form = useSampleForm();
  const isDisabled = useIsFieldDisabled("manualGroupIds");
  return (
    <form.AppField name="manualGroupIds">
      {(field) =>
        options.length === 0 && field.state.value.length === 0 ? null : (
          <FormSection title={m.section_manual_groups()}>
            <field.CheckboxGroupField
              label={m.field_manual_groups()}
              items={options.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
            />
            {isDisabled ? (
              <p className="text-muted-foreground text-sm">
                {m.manual_groups_field_locked()}
              </p>
            ) : null}
          </FormSection>
        )
      }
    </form.AppField>
  );
}
