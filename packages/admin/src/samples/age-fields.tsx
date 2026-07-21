import { FormSection } from "@projet-igsn/design-system/components/form/form-section";

import { m } from "#/paraglide/messages.js";
import { GeologicalAgeFormSection } from "#/samples/geological-age-form-section.tsx";
import { NumericAgeFormSection } from "#/samples/numeric-age-form-section.tsx";

// The Age section (Physical description tab): a numeric-age section and a
// stratigraphic-age section, each self-contained. Render inside a `form.AppForm`.
export function AgeFields() {
  return (
    <FormSection title={m.section_age()}>
      <NumericAgeFormSection />
      <GeologicalAgeFormSection />
    </FormSection>
  );
}
