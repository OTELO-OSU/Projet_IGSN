import { FormSection } from "@projet-igsn/design-system/components/form/form-section";

import { m } from "#/paraglide/messages.js";
import { SampleConditionFields } from "#/samples/sample-condition-fields.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";

export function PhysicalDescriptionFields() {
  return (
    <>
      <FormSection title={m.section_description()}>
        <SampleDescriptionFields />
      </FormSection>

      <FormSection title={m.section_condition()}>
        <SampleConditionFields />
      </FormSection>
    </>
  );
}
