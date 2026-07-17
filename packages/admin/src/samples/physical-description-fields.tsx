import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";

import { m } from "#/paraglide/messages.js";
import { LocationFields } from "#/samples/location-fields.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";
import { useLocationForm } from "#/samples/use-location-form.ts";

// The Physical description tab: the description section, then the location
// section. Render inside a `form.AppForm`.
export function PhysicalDescriptionFields() {
  const form = useLocationForm();
  return (
    <>
      <FormSection title={m.section_description()}>
        <SampleDescriptionFields />
      </FormSection>

      {/* Synthetic samples must not carry a location (ADR 0014), so the
          section is hidden for them; it stays for optional and required
          materials. */}
      <form.Subscribe
        selector={(state) =>
          locationRequirement(
            composeHierarchyValue(state.values.materialPath),
          ) !== "forbidden"
        }
      >
        {(showLocation) =>
          showLocation ? (
            <FormSection title={m.section_location()}>
              <LocationFields />
            </FormSection>
          ) : null
        }
      </form.Subscribe>
    </>
  );
}
