import type { Condition } from "../condition/model.ts";
import type { Repository } from "../repository/model.ts";
import type { CoreCuration } from "./core-curation-schema.ts";
import type { CoreAgentRole } from "./core-sample-schema.ts";

import { orNull } from "./core-optional.ts";
import { responsibilityFinders } from "./from-core-responsibility.ts";
import { fromLaboratoryUri, fromOsuUri } from "./institution-uri.ts";
import { fromQuantity } from "./quantity.ts";

export function fromCoreCondition(curation: CoreCuration): Condition | null {
  const condition = curation.sampleCondition;
  if (condition == null) return null;
  return {
    packaging: condition.packaging?.id ?? null,
    storageConditions:
      condition.storageCondition?.map((concept) => concept.id) ?? null,
    temperature:
      condition.temperature_type == null
        ? null
        : {
            type: condition.temperature_type.id,
            measurement: orNull(condition.temperature, fromQuantity),
          },
    humidity:
      condition.humidityType == null
        ? null
        : {
            type: condition.humidityType.id,
            percentage: condition.relativeHumidityPercent ?? null,
          },
    light: condition.lightCondition?.id ?? null,
    pressure:
      condition.pressureType == null
        ? null
        : {
            type: condition.pressureType.id,
            measurement: orNull(condition.pressure, fromQuantity),
          },
    specificConditions: condition.description ?? null,
  };
}

export function fromCoreRepository(
  curation: CoreCuration,
  responsibility: CoreAgentRole[],
): Repository | null {
  const current = curation.currentRepository;
  const rightsHolder =
    responsibilityFinders(responsibility).rorsOf("SampleOwner");
  if (current == null && rightsHolder == null) return null;
  const codeOf = (fromUri: (uri: string) => string | null) =>
    (current?.organizations ?? [])
      .map(({ id }) => fromUri(id))
      .find((code) => code != null) ?? null;
  return {
    currentArchiveOsu: codeOf(fromOsuUri),
    currentArchiveLaboratory: codeOf(fromLaboratoryUri),
    currentArchiveContactFirstname: current?.contactFirstName ?? null,
    currentArchiveContactLastname: current?.contactLastName ?? null,
    collectionName: current?.collectionName ?? null,
    rightsHolder,
  };
}
