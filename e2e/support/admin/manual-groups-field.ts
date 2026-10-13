import { type Page } from "@playwright/test";

import { pickComboboxOption } from "./pick-combobox-option.ts";

export const attachManualGroup = (page: Page, field: string, name: string) =>
  pickComboboxOption(page, {
    field,
    option: name,
    chipLabel: `Detach ${name}`,
  });
