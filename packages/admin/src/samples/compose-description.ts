import type { DatePrecision } from "@projet-igsn/domain/sample/description/collection-date";
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
  collectionDatePrecision: DatePrecision;
  collectionDateTimeZone: string | undefined;
  oriented: boolean;
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
    | {
        precision: DatePrecision;
        start: string | undefined;
        end: string | undefined;
        timeZone: string | undefined;
      }
    | undefined;
  oriented: boolean;
  orientationExplanation: string | undefined;
  openDescription: string | undefined;
  length: MeasurementCandidate<SizeUnit> | undefined;
  width: MeasurementCandidate<SizeUnit> | undefined;
  thickness: MeasurementCandidate<SizeUnit> | undefined;
  mass: MeasurementCandidate<MassUnit> | undefined;
  volume: MeasurementCandidate<VolumeUnit> | undefined;
};

function composeCollectionDate(draft: DescriptionDraft) {
  if (
    draft.collectionDateStart === undefined &&
    draft.collectionDateEnd === undefined
  ) {
    return undefined;
  }
  return {
    precision: draft.collectionDatePrecision,
    start: draft.collectionDateStart,
    end: draft.collectionDateEnd,
    timeZone:
      draft.collectionDatePrecision === "hour"
        ? draft.collectionDateTimeZone
        : undefined,
  };
}

export function composeDescription(
  draft: DescriptionDraft,
): DescriptionCandidate {
  return {
    collectionDate: composeCollectionDate(draft),
    oriented: draft.oriented,
    orientationExplanation: draft.oriented
      ? draft.orientationExplanation?.trim() || undefined
      : undefined,
    openDescription: draft.openDescription?.trim() || undefined,
    length: composeMeasurement(draft.lengthValue, draft.lengthUnit),
    width: composeMeasurement(draft.widthValue, draft.widthUnit),
    thickness: composeMeasurement(draft.thicknessValue, draft.thicknessUnit),
    mass: composeMeasurement(draft.massValue, draft.massUnit),
    volume: composeMeasurement(draft.volumeValue, draft.volumeUnit),
  };
}

export function toDescriptionDraft(
  description: Description | null | undefined,
): DescriptionDraft {
  const collectionDate = description?.collectionDate;
  return {
    collectionDateStart: collectionDate?.start,
    collectionDateEnd: collectionDate?.end,
    collectionDatePrecision: collectionDate?.precision ?? "day",
    collectionDateTimeZone:
      collectionDate?.precision === "hour"
        ? collectionDate.timeZone
        : undefined,
    oriented: description?.oriented ?? false,
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
