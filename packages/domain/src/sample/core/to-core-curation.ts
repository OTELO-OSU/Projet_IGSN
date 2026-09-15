import type { Sample } from "../sample.ts";
import type { CoreCuration } from "./core-curation-schema.ts";

import { organizationLabel } from "../../institutional-group/label.ts";
import { availabilityStatusSchema } from "../curation/availability-status.ts";
import { existenceStatusSchema } from "../curation/existence-status.ts";
import { toConcept } from "./concept.ts";
import { joinContactName } from "./contact-name.ts";
import {
  coreAvailabilityStatus,
  coreExistenceStatus,
} from "./core-curation-schema.ts";
import { isEmpty, optionalConcept, optionalQuantity } from "./core-optional.ts";
import { toRorUri } from "./core-production-schema.ts";

export function toCoreCuration(sample: Sample): CoreCuration {
  const repository = sample.repository;
  const condition = sample.condition;
  const currentRepository = {
    organization:
      repository?.currentArchive == null
        ? undefined
        : {
            id: toRorUri(repository.currentArchive),
            name: organizationLabel(repository.currentArchive),
          },
    collectionName: repository?.collectionName ?? undefined,
    contact:
      joinContactName(
        repository?.currentArchiveContactFirstname,
        repository?.currentArchiveContactLastname,
      ) || undefined,
  };
  const originalRepository = {
    organization:
      repository?.originalArchive == null
        ? undefined
        : { name: repository.originalArchive },
    contact:
      joinContactName(
        repository?.originalArchiveContactFirstname,
        repository?.originalArchiveContactLastname,
      ) || undefined,
  };
  const sampleCondition = {
    storageCondition: condition?.storageConditions?.map((storage) =>
      toConcept("sample_condition", storage),
    ),
    temperature_type: optionalConcept(
      "sample_condition",
      condition?.temperature?.type,
    ),
    temperature: optionalQuantity(condition?.temperature?.measurement),
    humidityType: optionalConcept("humidity-type", condition?.humidity?.type),
    relativeHumidityPercent: condition?.humidity?.percentage ?? undefined,
    pressureType: optionalConcept("pressure-type", condition?.pressure?.type),
    pressure: optionalQuantity(condition?.pressure?.measurement),
    lightCondition: optionalConcept("light", condition?.light),
    packaging: optionalConcept("packaging", condition?.packaging),
    description: condition?.specificConditions ?? undefined,
  };
  return {
    existenceStatus: coreExistenceStatus.toCore(
      existenceStatusSchema.parse(sample.existenceStatus),
    ),
    availabilityStatus: coreAvailabilityStatus.toCore(
      availabilityStatusSchema.parse(sample.availabilityStatus),
    ),
    currentRepository: isEmpty(currentRepository)
      ? undefined
      : currentRepository,
    originalRepository: isEmpty(originalRepository)
      ? undefined
      : originalRepository,
    sampleCondition: isEmpty(sampleCondition) ? undefined : sampleCondition,
  };
}
