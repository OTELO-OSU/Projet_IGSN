import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { SampleSeries } from "@projet-igsn/domain/sample/series/model";

import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import { canSetSampleChildren } from "@projet-igsn/domain/sample/publication/can-set-sample-children";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";

import { m } from "#/paraglide/messages.js";
import { CollectionDateField } from "#/samples/collection-date-field.tsx";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import { LocalIdFields } from "#/samples/local-id-fields.tsx";
import { ProvenanceStatusField } from "#/samples/provenance-status-field.tsx";
import { SampleChildrenField } from "#/samples/sample-children-field.tsx";
import { natureLabel } from "#/samples/sample-labels.ts";
import { SampleManualGroupsField } from "#/samples/sample-manual-groups-field.tsx";
import { SampleProcessStepsFields } from "#/samples/sample-process-steps-fields.tsx";
import { SampleSeriesField } from "#/samples/sample-series-field.tsx";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const natureItems = toComboboxItems(natureSchema.options, natureLabel);

export function SampleIdentityTab({
  parents,
  hasSubSamples,
  storedSeries,
  storedChildren,
  manualGroupOptions,
  sampleId,
  status,
}: {
  parents: readonly Pick<SampleParent, "igsn" | "name">[];
  hasSubSamples: boolean;
  storedSeries: SampleSeries | null;
  storedChildren: SampleParent[] | undefined;
  manualGroupOptions: ManualGroup[];
  sampleId: string | undefined;
  status: SampleStatus;
}) {
  const form = useSampleForm();
  return (
    <>
      <FormSection title={m.section_sample()}>
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label={m.field_name()}
              placeholder={m.name_placeholder()}
            />
          )}
        </form.AppField>

        <LocalIdFields />

        <SampleTypeFields
          canBeSeries={
            canBecomeSeries({ parents, hasSubSamples }) && storedSeries === null
          }
        />

        <form.AppField name="nature">
          {(field) => (
            <field.ComboboxField
              label={m.field_nature()}
              items={natureItems}
              placeholder={m.nature_placeholder()}
              searchPlaceholder={m.nature_search_placeholder()}
              emptyText={m.nature_empty()}
            />
          )}
        </form.AppField>

        <CollectionMethodField />

        <ProvenanceStatusField />

        {parents.length === 0 ? (
          <CollectionDateField />
        ) : (
          <FieldDisabledProvider value={() => true}>
            <CollectionDateField />
          </FieldDisabledProvider>
        )}
      </FormSection>

      {parents.length > 0 ? <SampleProcessStepsFields /> : null}

      <SampleManualGroupsField options={manualGroupOptions} />

      <SampleChildrenField
        sampleId={sampleId}
        storedChildren={storedChildren}
        canSetChildren={canSetSampleChildren({ status })}
      />

      <SampleSeriesField
        storedSeries={storedSeries}
        status={status}
        hasParents={parents.length > 0}
      />
    </>
  );
}
