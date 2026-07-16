import type { MassUnit } from "@projet-igsn/domain/sample/description/mass-unit";
import type { Description } from "@projet-igsn/domain/sample/description/model";
import type { SizeUnit } from "@projet-igsn/domain/sample/description/size-unit";
import type { VolumeUnit } from "@projet-igsn/domain/sample/description/volume-unit";

// The Description tab's flat form draft, mirroring compose-location.ts: every
// field holds its typed value or nullish when unset. `collectionDateMode` is
// pure UI state (single date vs range); it lives in the form store so it
// survives the tab unmounting, but never reaches the submitted sample.
export type DescriptionDraft = {
  collectionDateMode: "single" | "range";
  collectionDate: string | undefined;
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
// behind the UI state (the other date mode's fields, an explanation without
// oriented = yes), since an error on a hidden field could never be fixed.
type MeasurementCandidate<Unit> = {
  value: number | undefined;
  unit: Unit | undefined;
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

// A pair flows through once either half is set, so the schema can flag the
// missing half; both halves unset means the measurement was not entered.
const composeMeasurement = <Unit extends string>(
  value: number | undefined,
  unit: Unit | null | undefined,
): MeasurementCandidate<Unit> | undefined =>
  value === undefined && !unit ? undefined : { value, unit: unit ?? undefined };

function composeCollectionDate(
  draft: DescriptionDraft,
): DescriptionCandidate["collectionDate"] {
  // A single collection date is the degenerate range start === end (ADR 0015).
  // The other mode's fields are hidden, so their values are UI leftovers.
  if (draft.collectionDateMode !== "range") {
    return draft.collectionDate
      ? { start: draft.collectionDate, end: draft.collectionDate }
      : undefined;
  }
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
    // The explanation field is only shown when oriented is yes, so a value
    // lingering after switching away is a hidden leftover, not entered data.
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
  const period = description?.collectionDate ?? undefined;
  const isSingle = period === undefined || period.start === period.end;
  return {
    collectionDateMode: isSingle ? "single" : "range",
    collectionDate: period && isSingle ? period.start : undefined,
    collectionDateStart: period && !isSingle ? period.start : undefined,
    collectionDateEnd: period && !isSingle ? period.end : undefined,
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
