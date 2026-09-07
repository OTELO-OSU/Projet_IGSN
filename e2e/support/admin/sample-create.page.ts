import { expect, type Page } from "@playwright/test";

import {
  attachManualGroup,
  expectNoManualGroupOffered,
} from "./manual-groups-field.ts";
import { sampleFormPage } from "./sample-form.page.ts";

export function sampleCreatePage(page: Page) {
  return {
    ...sampleFormPage(page),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Create sample" }),
      ).toBeVisible(),
    fillName: (name: string) => page.getByLabel(/name/i).fill(name),
    selectNature: async (label: string) => {
      await page.getByRole("combobox", { name: /nature/i }).click();
      await page.getByRole("option", { name: label }).click();
    },
    attachManualGroup: (name: string) =>
      attachManualGroup(page, "Groups this sample belongs to", name),
    expectNoManualGroupOffered: () => expectNoManualGroupOffered(page),
    submit: () =>
      page.getByRole("button", { name: "Save", exact: true }).click(),
    expectNameRequired: () =>
      expect(page.getByText("Name is required")).toBeVisible(),
  };
}
