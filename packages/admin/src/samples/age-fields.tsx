import { FormSection } from "@projet-igsn/design-system/components/form/form-section";

import { m } from "#/paraglide/messages.js";
import { GeologicalAgeFormSection } from "#/samples/geological-age-form-section.tsx";
import { NumericAgeFormSection } from "#/samples/numeric-age-form-section.tsx";

export function AgeFields() {
  return (
    <FormSection title={m.section_age()}>
      <NumericAgeFormSection />
      <GeologicalAgeFormSection />
    </FormSection>
  );
}
