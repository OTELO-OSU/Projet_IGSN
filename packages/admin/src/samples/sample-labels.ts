import {
  createSampleLabels,
  type Messages,
} from "@projet-igsn/domain/sample/create-sample-labels";

import { m } from "#/paraglide/messages.js";

// The domain resolvers bound to this app's paraglide catalog. The resolving
// logic lives in domain; only this `m` binding is per app.
export const {
  materialPathLabel,
  typeLabel,
  collectionMethodLabel,
  economicInterestLabel,
  elementLabel,
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
  numericUnitLabel,
  yearsUnitLabel,
  geologicalAgeLabel,
} = createSampleLabels(m as unknown as Messages);
