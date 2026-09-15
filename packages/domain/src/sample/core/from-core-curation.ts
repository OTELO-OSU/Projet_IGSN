import type { Condition } from "../condition/model.ts";
import type { Repository } from "../repository/model.ts";
import type { CoreCuration } from "./core-curation-schema.ts";

import { splitContactName } from "./contact-name.ts";
import { orNull } from "./core-optional.ts";
import { fromRorUri } from "./core-production-schema.ts";
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

export function fromCoreRepository(curation: CoreCuration): Repository | null {
  const current = curation.currentRepository;
  const original = curation.originalRepository;
  if (current == null && original == null) return null;
  const currentContact = splitContactName(current?.contact);
  const originalContact = splitContactName(original?.contact);
  return {
    currentArchive: orNull(current?.organization?.id, fromRorUri),
    currentArchiveContactFirstname: currentContact.firstname,
    currentArchiveContactLastname: currentContact.lastname,
    collectionName: current?.collectionName ?? null,
    originalArchive: original?.organization?.name ?? null,
    originalArchiveContactFirstname: originalContact.firstname,
    originalArchiveContactLastname: originalContact.lastname,
  };
}
