import {
  createSampleLabels,
  type Messages,
} from "@projet-igsn/domain/sample/create-sample-labels";

import { m } from "#/paraglide/messages.js";

export const {
  materialPathLabel,
  typeLabel,
  collectionMethodLabel,
  geomorphologicalEnvironmentLabel,
  textureLabel,
  metamorphicFaciesLabel,
  natureLabel,
  oceanSeaLabel,
  verticalReferenceLabel,
  verticalReferenceSystemLabel,
  packagingLabel,
  storageConditionLabel,
  temperatureTypeLabel,
  humidityTypeLabel,
  lightLabel,
  pressureTypeLabel,
  existenceStatusLabel,
  availabilityStatusLabel,
  resourceTypeLabel,
  elementLabel,
  numericUnitLabel,
  yearsUnitLabel,
  geologicalAgeLabel,
  provenanceStatusLabel,
  collectionOriginLabel,
  startingMaterialNatureLabel,
  startingMaterialFormLabel,
  finalProductLabel,
  experimentTypeLabel,
} = createSampleLabels(m as unknown as Messages);
