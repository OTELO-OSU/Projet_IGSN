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
  packagingLabel,
  storageConditionLabel,
  temperatureTypeLabel,
  humidityTypeLabel,
  lightLabel,
  pressureTypeLabel,
  availabilityLabel,
  economicInterestLabel,
  elementLabel,
  numericUnitLabel,
  yearsUnitLabel,
  geologicalAgeLabel,
  provenanceStatusLabel,
  collectionOriginLabel,
} = createSampleLabels(m as unknown as Messages);
