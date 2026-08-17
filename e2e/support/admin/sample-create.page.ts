import { expect, type Page } from "@playwright/test";

import { expectNoManualGroupOffered } from "./manual-groups-field.ts";

export function sampleCreatePage(page: Page) {
  return {
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Create sample" }),
      ).toBeVisible(),
    fillName: (name: string) => page.getByLabel(/name/i).fill(name),
    selectNature: async (label: string) => {
      await page.getByRole("combobox", { name: /nature/i }).click();
      await page.getByRole("option", { name: label }).click();
    },
    checkManualGroup: (name: string) =>
      page.getByRole("checkbox", { name }).check(),
    expectNoManualGroupOffered: () => expectNoManualGroupOffered(page),
    submit: () => page.getByRole("button", { name: "Create" }).click(),
    expectNameRequired: () =>
      expect(page.getByText("Name is required")).toBeVisible(),
  };
}
