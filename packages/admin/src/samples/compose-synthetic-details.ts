import type { PressureUnit } from "@projet-igsn/domain/sample/condition/pressure-unit";
import type { TemperatureUnit } from "@projet-igsn/domain/sample/condition/temperature-unit";
import type { DatePrecision } from "@projet-igsn/domain/sample/date-range";
import type { ExperimentDurationUnit } from "@projet-igsn/domain/sample/synthetic-details/experiment-duration-unit";
import type { ExperimentType } from "@projet-igsn/domain/sample/synthetic-details/experiment-type";
import type { FinalProduct } from "@projet-igsn/domain/sample/synthetic-details/final-product";
import type { SyntheticDetails } from "@projet-igsn/domain/sample/synthetic-details/model";
import type { StartingMaterial } from "@projet-igsn/domain/sample/synthetic-details/starting-material";
import type { StartingMaterialNature } from "@projet-igsn/domain/sample/synthetic-details/starting-material-nature";

import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { needsStartingMaterialComposition } from "@projet-igsn/domain/sample/synthetic-details/needs-starting-material-composition";

import { composeContact } from "#/samples/compose-contact.ts";
import {
  composeDateRange,
  type DateRangeCandidate,
  toDateRangeDraft,
} from "#/samples/compose-date-range.ts";
import {
  composeMeasurement,
  type MeasurementCandidate,
} from "#/samples/compose-measurement.ts";
import { nonEmpty } from "#/samples/compose-scientific-context.ts";
import { type DraftOptions } from "#/samples/draft-defaults.ts";

export type SyntheticDetailsDraft = {
  startingMaterial: StartingMaterial | undefined;
  startingMaterialNature: StartingMaterialNature | undefined;
  startingMaterialComposition: string | null | undefined;
  finalProduct: FinalProduct | undefined;
  experimentType: ExperimentType | undefined;
  experimentDurationValue: number | undefined;
  experimentDurationUnit: ExperimentDurationUnit | null | undefined;
  synthesisDateStart: string | undefined;
  synthesisDateEnd: string | undefined;
  synthesisDatePrecision: DatePrecision;
  synthesisDateTimeZone: string | undefined;
  operatorUserId: string | null | undefined;
  operatorFirstname: string | null | undefined;
  operatorLastname: string | null | undefined;
  researchStructure: string[];
  temperatureValue: number | undefined;
  temperatureUnit: TemperatureUnit | null | undefined;
  pressureValue: number | undefined;
  pressureUnit: PressureUnit | null | undefined;
  experimentalProtocol: string | null | undefined;
  experimentPurpose: string | null | undefined;
  equipmentUsed: string | null | undefined;
};

type SyntheticDetailsCandidate = {
  startingMaterial: StartingMaterial | undefined;
  startingMaterialNature: StartingMaterialNature | undefined;
  startingMaterialComposition: string | undefined;
  finalProduct: FinalProduct | undefined;
  experimentType: ExperimentType | undefined;
  experimentDuration: MeasurementCandidate<ExperimentDurationUnit> | undefined;
  synthesisDate: DateRangeCandidate;
  operatorUserId: string | undefined;
  operatorFirstname: string | undefined;
  operatorLastname: string | undefined;
  researchStructure: string[] | undefined;
  temperature: MeasurementCandidate<TemperatureUnit> | undefined;
  pressure: MeasurementCandidate<PressureUnit> | undefined;
  experimentalProtocol: string | undefined;
  experimentPurpose: string | undefined;
  equipmentUsed: string | undefined;
};

export function composeSyntheticDetails(
  draft: SyntheticDetailsDraft,
  material: string | null,
): SyntheticDetailsCandidate | null {
  if (!isSyntheticMaterial(material)) return null;
  const operator = composeContact(
    draft.operatorUserId,
    draft.operatorFirstname,
    draft.operatorLastname,
  );
  const details = {
    startingMaterial: draft.startingMaterial,
    startingMaterialNature: draft.startingMaterialNature,
    startingMaterialComposition: needsStartingMaterialComposition(
      draft.startingMaterial,
    )
      ? draft.startingMaterialComposition?.trim() || undefined
      : undefined,
    finalProduct: draft.finalProduct,
    experimentType: draft.experimentType,
    experimentDuration: composeMeasurement(
      draft.experimentDurationValue,
      draft.experimentDurationUnit,
    ),
    synthesisDate: composeDateRange({
      start: draft.synthesisDateStart,
      end: draft.synthesisDateEnd,
      precision: draft.synthesisDatePrecision,
      timeZone: draft.synthesisDateTimeZone,
    }),
    operatorUserId: operator.userId,
    operatorFirstname: operator.firstname,
    operatorLastname: operator.lastname,
    researchStructure: nonEmpty(draft.researchStructure),
    temperature: composeMeasurement(
      draft.temperatureValue,
      draft.temperatureUnit,
    ),
    pressure: composeMeasurement(draft.pressureValue, draft.pressureUnit),
    experimentalProtocol: draft.experimentalProtocol?.trim() || undefined,
    experimentPurpose: draft.experimentPurpose?.trim() || undefined,
    equipmentUsed: draft.equipmentUsed?.trim() || undefined,
  } satisfies SyntheticDetailsCandidate;
  return Object.values(details).some((part) => part !== undefined)
    ? details
    : null;
}

export function toSyntheticDetailsDraft(
  value?: SyntheticDetails | null,
  options: DraftOptions = {},
): SyntheticDetailsDraft {
  const synthesisDate = toDateRangeDraft(value?.synthesisDate, options);
  return {
    startingMaterial: value?.startingMaterial ?? undefined,
    startingMaterialNature: value?.startingMaterialNature ?? undefined,
    startingMaterialComposition:
      value?.startingMaterialComposition ?? undefined,
    finalProduct: value?.finalProduct ?? undefined,
    experimentType: value?.experimentType ?? undefined,
    experimentDurationValue: value?.experimentDuration?.value,
    experimentDurationUnit: value?.experimentDuration?.unit,
    synthesisDateStart: synthesisDate.start,
    synthesisDateEnd: synthesisDate.end,
    synthesisDatePrecision: synthesisDate.precision,
    synthesisDateTimeZone: synthesisDate.timeZone,
    operatorUserId: value?.operatorUserId ?? undefined,
    operatorFirstname: value?.operatorFirstname ?? undefined,
    operatorLastname: value?.operatorLastname ?? undefined,
    researchStructure: value?.researchStructure ?? [],
    temperatureValue: value?.temperature?.value,
    temperatureUnit: value?.temperature?.unit,
    pressureValue: value?.pressure?.value,
    pressureUnit: value?.pressure?.unit,
    experimentalProtocol: value?.experimentalProtocol ?? undefined,
    experimentPurpose: value?.experimentPurpose ?? undefined,
    equipmentUsed: value?.equipmentUsed ?? undefined,
  };
}
