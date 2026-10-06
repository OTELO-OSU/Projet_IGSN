import type { Messages } from "@projet-igsn/domain/sample/create-sample-labels";

import { createCardFields } from "@projet-igsn/domain/sample/card-field/create-card-fields";

import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export type { CardSample } from "@projet-igsn/domain/sample/card-field/create-card-fields";

export const {
  PICKABLE_FIELDS,
  selectedCardFields,
  pickedCardFieldKeys,
  typeNatureText,
  collectorText,
  materialText,
  locationText,
  formatNumericAge,
  formatGeologicalAge,
} = createCardFields(m as unknown as Messages, getLocale);
