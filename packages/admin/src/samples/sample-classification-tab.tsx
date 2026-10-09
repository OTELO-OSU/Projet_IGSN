import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { allowsSpecificName } from "@projet-igsn/domain/sample/material/allows-specific-name";
import { allowsMineralClassifications } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";

import { m } from "#/paraglide/messages.js";
import { MaterialField } from "#/samples/material-field.tsx";
import { MetamorphicDetails } from "#/samples/metamorphic-details.tsx";
import { SampleEconomicInterestFields } from "#/samples/sample-economic-interest-fields.tsx";
import { SampleMineralClassificationsFields } from "#/samples/sample-mineral-classifications-fields.tsx";
import { SampleSyntheticDetailsFields } from "#/samples/sample-synthetic-details-fields.tsx";
import { TextureField } from "#/samples/texture-field.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleClassificationTab({
  material,
}: {
  material: string | null;
}) {
  const form = useSampleForm();
  return (
    <>
      <FormSection title={m.section_material()}>
        <MaterialField />
        <TextureField />
        <MetamorphicDetails />
        {allowsMineralClassifications(material) ? (
          <SampleMineralClassificationsFields />
        ) : null}
        {allowsSpecificName(material) ? (
          <form.AppField name="specificName">
            {(field) => (
              <field.TextField
                label={m.field_specific_name()}
                placeholder={m.specific_name_placeholder()}
                reveal={{ label: m.reveal_specific_name(), canReveal: true }}
              />
            )}
          </form.AppField>
        ) : null}
      </FormSection>

      <SampleEconomicInterestFields />

      {isSyntheticMaterial(material) ? (
        <FormSection title={m.section_synthetic_details()}>
          <SampleSyntheticDetailsFields />
        </FormSection>
      ) : null}
    </>
  );
}
