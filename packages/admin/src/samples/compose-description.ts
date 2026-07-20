import type { MassUnit } from "@projet-igsn/domain/sample/description/mass-unit";
import type { Description } from "@projet-igsn/domain/sample/description/model";
import type { SizeUnit } from "@projet-igsn/domain/sample/description/size-unit";
import type { VolumeUnit } from "@projet-igsn/domain/sample/description/volume-unit";

import {
  composeMeasurement,
  type MeasurementCandidate,
} from "#/samples/compose-measurement.ts";

// The Description tab's flat form draft, mirroring compose-location.ts: every
// field holds its typed value or nullish when unset. The store always carries
// the canonical range; the single-date/range mode is component state of
// CollectionDatesField (single mode mirrors one input into both ends).
export type DescriptionDraft = {
  collectionDateStart: string | undefined;
  collectionDateEnd: string | undefined;
  oriented: "yes" | "no" | null | undefined;
  orientationExplanation: string | null | undefined;
  openDescription: string | null | undefined;
  lengthValue: number | undefined;
  lengthUnit: SizeUnit | null | undefined;
  widthValue: number | undefined;
  widthUnit: SizeUnit | null | undefined;
  thicknessValue: number | undefined;
  thicknessUnit: SizeUnit | null | undefined;
  massValue: number | undefined;
  massUnit: MassUnit | null | undefined;
  volumeValue: number | undefined;
  volumeUnit: VolumeUnit | null | undefined;
};

// A description as composed from the draft, before descriptionSchema judges
// it: the Description shape with possibly missing leaf values. Compose does
// not decide completeness; the schema (via sampleDraftSchema) rejects a
// half-filled pair on the offending field. Compose only excludes values hidden
// behind the UI state (an explanation without oriented = yes), since an error
// on a hidden field could never be fixed.
type DescriptionCandidate = {
  collectionDate:
    | { start: string | undefined; end: string | undefined }
    | undefined;
  oriented: boolean | undefined;
  orientationExplanation: string | undefined;
  openDescription: string | undefined;
  length: MeasurementCandidate<SizeUnit> | undefined;
  width: MeasurementCandidate<SizeUnit> | undefined;
  thickness: MeasurementCandidate<SizeUnit> | undefined;
  mass: MeasurementCandidate<MassUnit> | undefined;
  volume: MeasurementCandidate<VolumeUnit> | undefined;
};

// A single collection date arrives as the mirrored degenerate range
// start === end (ADR 0015), so compose sees one shape for both modes.
function composeCollectionDate(draft: DescriptionDraft) {
  return draft.collectionDateStart === undefined &&
    draft.collectionDateEnd === undefined
    ? undefined
    : { start: draft.collectionDateStart, end: draft.collectionDateEnd };
}

export function composeDescription(
  draft: DescriptionDraft,
): DescriptionCandidate | null {
  const oriented =
    draft.oriented === "yes"
      ? true
      : draft.oriented === "no"
        ? false
        : undefined;
  const description = {
    collectionDate: composeCollectionDate(draft),
    oriented,
    // The explanation field is disabled unless oriented is yes, so a value
    // lingering after switching away is an uneditable leftover, not entered
    // data.
    orientationExplanation:
      oriented === true
        ? draft.orientationExplanation?.trim() || undefined
        : undefined,
    openDescription: draft.openDescription?.trim() || undefined,
    length: composeMeasurement(draft.lengthValue, draft.lengthUnit),
    width: composeMeasurement(draft.widthValue, draft.widthUnit),
    thickness: composeMeasurement(draft.thicknessValue, draft.thicknessUnit),
    mass: composeMeasurement(draft.massValue, draft.massUnit),
    volume: composeMeasurement(draft.volumeValue, draft.volumeUnit),
  };
  // All parts unset means no description at all; undefined values are dropped
  // by JSON on the wire, so the stored shape stays minimal.
  return Object.values(description).some((part) => part !== undefined)
    ? description
    : null;
}

export function toDescriptionDraft(
  description: Description | null | undefined,
): DescriptionDraft {
  return {
    collectionDateStart: description?.collectionDate?.start,
    collectionDateEnd: description?.collectionDate?.end,
    oriented:
      description?.oriented == null
        ? undefined
        : description.oriented
          ? "yes"
          : "no",
    orientationExplanation: description?.orientationExplanation ?? undefined,
    openDescription: description?.openDescription ?? undefined,
    lengthValue: description?.length?.value,
    lengthUnit: description?.length?.unit,
    widthValue: description?.width?.value,
    widthUnit: description?.width?.unit,
    thicknessValue: description?.thickness?.value,
    thicknessUnit: description?.thickness?.unit,
    massValue: description?.mass?.value,
    massUnit: description?.mass?.unit,
    volumeValue: description?.volume?.value,
    volumeUnit: description?.volume?.unit,
  };
}
