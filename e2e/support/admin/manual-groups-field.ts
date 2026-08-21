import { expect, type Page } from "@playwright/test";

import { pickComboboxOption } from "./pick-combobox-option.ts";

export const waitForMyManualGroups = (page: Page) =>
  page.waitForResponse((response) =>
    response.url().includes("currentUser/manual-groups"),
  );

export const expectNoManualGroupOffered = (page: Page) =>
  expect(
    page.getByRole("heading", { name: "Manual groups", level: 2 }),
  ).toBeHidden();

export const attachManualGroup = (page: Page, field: string, name: string) =>
  pickComboboxOption(page, {
    field,
    option: name,
    chipLabel: `Detach ${name}`,
  });
