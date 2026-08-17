import type { MassUnit } from "@projet-igsn/domain/sample/description/mass-unit";
import type { Description } from "@projet-igsn/domain/sample/description/model";
import type { SizeUnit } from "@projet-igsn/domain/sample/description/size-unit";
import type { VolumeUnit } from "@projet-igsn/domain/sample/description/volume-unit";

import {
  composeMeasurement,
  type MeasurementCandidate,
} from "#/samples/compose-measurement.ts";

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

function composeCollectionDate(draft: DescriptionDraft) {
  return draft.collectionDateStart === undefined &&
    draft.collectionDateEnd === undefined
    ? undefined
    : { start: draft.collectionDateStart, end: draft.collectionDateEnd };
}

export const isOrientedYes = (
  oriented: DescriptionDraft["oriented"],
): boolean => oriented === "yes";

export function composeDescription(
  draft: DescriptionDraft,
): DescriptionCandidate | null {
  const oriented = isOrientedYes(draft.oriented)
    ? true
    : draft.oriented === "no"
      ? false
      : undefined;
  const description = {
    collectionDate: composeCollectionDate(draft),
    oriented,
    orientationExplanation: isOrientedYes(draft.oriented)
      ? draft.orientationExplanation?.trim() || undefined
      : undefined,
    openDescription: draft.openDescription?.trim() || undefined,
    length: composeMeasurement(draft.lengthValue, draft.lengthUnit),
    width: composeMeasurement(draft.widthValue, draft.widthUnit),
    thickness: composeMeasurement(draft.thicknessValue, draft.thicknessUnit),
    mass: composeMeasurement(draft.massValue, draft.massUnit),
    volume: composeMeasurement(draft.volumeValue, draft.volumeUnit),
  };
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
