import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";

import { m } from "#/paraglide/messages.js";
import { AddParentField } from "#/samples/add-parent-field.tsx";
import { ParentSampleField } from "#/samples/parent-sample-field.tsx";
import { parentTabLabel } from "#/samples/sample-form-tabs.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleParentTab({
  parents,
  sampleId,
  offersParentPicker,
}: {
  parents: Pick<SampleParent, "igsn" | "name">[];
  sampleId: string | undefined;
  offersParentPicker: boolean;
}) {
  const form = useSampleForm();
  return (
    <FormSection
      title={parentTabLabel(parents.length)}
      description={offersParentPicker ? m.add_parent_description() : undefined}
    >
      {parents.length > 0 ? (
        parents.map((each, index) => (
          <ParentSampleField
            key={each.igsn}
            parent={each}
            isSaved={sampleId !== undefined}
            label={
              parents.length > 1
                ? m.field_parent_numbered({
                    index: index + 1,
                  })
                : m.field_parent()
            }
          />
        ))
      ) : offersParentPicker ? (
        <form.AppField name="parentIds">
          {(field) => (
            <AddParentField
              childId={sampleId}
              parentIds={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.AppField>
      ) : (
        <p className="text-muted-foreground text-sm">{m.no_parent()}</p>
      )}
    </FormSection>
  );
}
