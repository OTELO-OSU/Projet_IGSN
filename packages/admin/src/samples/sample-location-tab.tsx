import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";

import { m } from "#/paraglide/messages.js";
import { LocationFields } from "#/samples/location-fields.tsx";
import { ParentSampleLink } from "#/samples/parent-sample-link.tsx";
import { SampleGeologicalContextFields } from "#/samples/sample-geological-context-fields.tsx";

export function SampleLocationTab({
  onlyParent,
}: {
  onlyParent: Pick<SampleParent, "igsn" | "name" | "material"> | undefined;
}) {
  return onlyParent && allowsLocation(onlyParent.material) ? (
    <FormSection
      title={m.section_location()}
      description={
        <>
          {m.location_inherited_from()} <ParentSampleLink parent={onlyParent} />
        </>
      }
    />
  ) : (
    <>
      <FormSection title={m.section_location()}>
        <LocationFields />
      </FormSection>

      <FormSection title={m.section_geological_context()}>
        <SampleGeologicalContextFields />
      </FormSection>
    </>
  );
}
