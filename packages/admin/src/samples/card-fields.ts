import type { Messages } from "@projet-igsn/domain/sample/create-sample-labels";

import { createCardFields } from "@projet-igsn/domain/sample/card-field/create-card-fields";

import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export const {
  OPTIONAL_CARD_FIELDS,
  collectorText,
  typeText,
  materialText,
  locationText,
} = createCardFields(m as unknown as Messages, getLocale);
