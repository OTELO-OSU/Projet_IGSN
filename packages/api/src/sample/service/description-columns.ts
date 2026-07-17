import type { Description } from "@projet-igsn/domain/sample/description/model";

// Domain description -> flat sample columns (ADR 0015), shared by insert and
// update. A null/absent description writes null everywhere, so an update
// clears what the input no longer carries.
export function descriptionColumns(
  description: Description | null | undefined,
) {
  return {
    collection_date_start: description?.collectionDate?.start ?? null,
    collection_date_end: description?.collectionDate?.end ?? null,
    oriented: description?.oriented ?? null,
    orientation_explanation: description?.orientationExplanation ?? null,
    open_description: description?.openDescription ?? null,
    length_value: description?.length?.value ?? null,
    length_unit: description?.length?.unit ?? null,
    width_value: description?.width?.value ?? null,
    width_unit: description?.width?.unit ?? null,
    thickness_value: description?.thickness?.value ?? null,
    thickness_unit: description?.thickness?.unit ?? null,
    mass_value: description?.mass?.value ?? null,
    mass_unit: description?.mass?.unit ?? null,
    volume_value: description?.volume?.value ?? null,
    volume_unit: description?.volume?.unit ?? null,
  };
}
