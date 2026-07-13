import { m } from "#/paraglide/messages.js";
import { GeologicalAgeFormSection } from "#/samples/geological-age-form-section.tsx";
import { NumericAgeFormSection } from "#/samples/numeric-age-form-section.tsx";

// The Age section (Physical description tab): a numeric-age section and a
// stratigraphic-age section, each self-contained. Render inside a `form.AppForm`.
export function AgeFields() {
  return (
    <section className="grid gap-6">
      <h2 className="text-lg font-semibold">{m.section_age()}</h2>
      <NumericAgeFormSection />
      <GeologicalAgeFormSection />
    </section>
  );
}
