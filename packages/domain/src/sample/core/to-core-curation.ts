import type { Sample } from "../sample.ts";
import type { CoreCuration } from "./core-curation-schema.ts";

import { availabilityStatusSchema } from "../curation/availability-status.ts";
import { existenceStatusSchema } from "../curation/existence-status.ts";
import { toConcept } from "./concept.ts";
import {
  coreAvailabilityStatus,
  coreExistenceStatus,
} from "./core-curation-schema.ts";
import { isEmpty, optionalConcept, optionalQuantity } from "./core-optional.ts";
import { institutionOrganizations } from "./institution-uri.ts";

export function toCoreCuration(sample: Sample): CoreCuration {
  const repository = sample.repository;
  const condition = sample.condition;
  const organizations = institutionOrganizations(
    repository?.currentArchiveOsu,
    repository?.currentArchiveLaboratory,
  );
  const currentRepository = {
    organizations: organizations.length === 0 ? undefined : organizations,
    collectionName: repository?.collectionName ?? undefined,
    contactFirstName: repository?.currentArchiveContactFirstname ?? undefined,
    contactLastName: repository?.currentArchiveContactLastname ?? undefined,
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
    sampleCondition: isEmpty(sampleCondition) ? undefined : sampleCondition,
  };
}
