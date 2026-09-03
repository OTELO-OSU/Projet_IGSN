import type { PressureUnit } from "@projet-igsn/domain/sample/condition/pressure-unit";
import type { TemperatureUnit } from "@projet-igsn/domain/sample/condition/temperature-unit";
import type { ExperimentDurationUnit } from "@projet-igsn/domain/sample/synthetic-details/experiment-duration-unit";
import type { ExperimentType } from "@projet-igsn/domain/sample/synthetic-details/experiment-type";
import type { FinalProduct } from "@projet-igsn/domain/sample/synthetic-details/final-product";
import type { SyntheticDetails } from "@projet-igsn/domain/sample/synthetic-details/model";
import type { StartingMaterial } from "@projet-igsn/domain/sample/synthetic-details/starting-material";
import type { StartingMaterialNature } from "@projet-igsn/domain/sample/synthetic-details/starting-material-nature";

import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { needsStartingMaterialComposition } from "@projet-igsn/domain/sample/synthetic-details/needs-starting-material-composition";

import {
  composeMeasurement,
  type MeasurementCandidate,
} from "#/samples/compose-measurement.ts";
import { nonEmpty } from "#/samples/compose-scientific-context.ts";

export type SyntheticDetailsDraft = {
  startingMaterial: StartingMaterial | undefined;
  startingMaterialNature: StartingMaterialNature | undefined;
  startingMaterialComposition: string | null | undefined;
  finalProduct: FinalProduct | undefined;
  experimentType: ExperimentType | undefined;
  experimentDurationValue: number | undefined;
  experimentDurationUnit: ExperimentDurationUnit | null | undefined;
  experimentDurationNotRelevant: boolean;
  synthesisDateStart: string | undefined;
  synthesisDateEnd: string | undefined;
  operatorName: string | null | undefined;
  operatorOrcid: string | null | undefined;
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
  experimentDurationNotRelevant: true | undefined;
  synthesisDate: { start: string; end: string } | undefined;
  operatorName: string | undefined;
  operatorOrcid: string | undefined;
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
    experimentDuration: draft.experimentDurationNotRelevant
      ? undefined
      : composeMeasurement(
          draft.experimentDurationValue,
          draft.experimentDurationUnit,
        ),
    experimentDurationNotRelevant:
      draft.experimentDurationNotRelevant || undefined,
    synthesisDate:
      draft.synthesisDateStart !== undefined &&
      draft.synthesisDateEnd !== undefined
        ? { start: draft.synthesisDateStart, end: draft.synthesisDateEnd }
        : undefined,
    operatorName: draft.operatorName?.trim() || undefined,
    operatorOrcid: draft.operatorOrcid?.trim() || undefined,
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
): SyntheticDetailsDraft {
  return {
    startingMaterial: value?.startingMaterial ?? undefined,
    startingMaterialNature: value?.startingMaterialNature ?? undefined,
    startingMaterialComposition:
      value?.startingMaterialComposition ?? undefined,
    finalProduct: value?.finalProduct ?? undefined,
    experimentType: value?.experimentType ?? undefined,
    experimentDurationValue: value?.experimentDuration?.value,
    experimentDurationUnit: value?.experimentDuration?.unit,
    experimentDurationNotRelevant:
      value?.experimentDurationNotRelevant ?? false,
    synthesisDateStart: value?.synthesisDate?.start,
    synthesisDateEnd: value?.synthesisDate?.end,
    operatorName: value?.operatorName ?? undefined,
    operatorOrcid: value?.operatorOrcid ?? undefined,
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
