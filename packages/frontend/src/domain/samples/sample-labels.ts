import {
  createSampleLabels,
  type Messages,
} from "@projet-igsn/domain/sample/create-sample-labels";

import { m } from "#/paraglide/messages.js";

export const {
  materialPathLabel,
  typeLabel,
  collectionMethodLabel,
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
  availabilityLabel,
  resourceTypeLabel,
  elementLabel,
  numericUnitLabel,
  yearsUnitLabel,
  geologicalAgeLabel,
  provenanceStatusLabel,
  collectionOriginLabel,
} = createSampleLabels(m as unknown as Messages);
