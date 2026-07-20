import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";

import { m } from "#/paraglide/messages.js";
import { LocationFields } from "#/samples/location-fields.tsx";
import { SampleConditionFields } from "#/samples/sample-condition-fields.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";

// The Physical description tab: the description section, the location
// section, then the condition section. Render inside a `form.AppForm`.
export function PhysicalDescriptionFields() {
  const form = useLocationForm();
  return (
    <>
      <FormSection title={m.section_description()}>
        <SampleDescriptionFields />
      </FormSection>

      {/* The section shows only once the material settles how to validate it
          (required or optional). Synthetic samples must not carry a location
          (ADR 0014), and an undetermined material cannot be asked about one
          yet, so both cases hide it. */}
      <form.Subscribe
        selector={(state) => {
          const requirement = locationRequirement(
            composeHierarchyValue(state.values.materialPath),
          );
          return requirement === "required" || requirement === "optional";
        }}
      >
        {(showLocation) =>
          showLocation ? (
            <FormSection title={m.section_location()}>
              <LocationFields />
            </FormSection>
          ) : null
        }
      </form.Subscribe>

      <FormSection title={m.section_condition()}>
        <SampleConditionFields />
      </FormSection>
    </>
  );
}
