import { expect, type Page } from "@playwright/test";

import { attachManualGroup } from "./manual-groups-field.ts";
import { sampleFormPage } from "./sample-form.page.ts";

export function sampleCreatePage(page: Page) {
  return {
    ...sampleFormPage(page),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Create sample" }),
      ).toBeVisible(),
    expectSubSampleVisible: (parentName: string) =>
      expect(
        page.getByRole("heading", {
          name: `Create sub sample of ${parentName}`,
        }),
      ).toBeVisible(),
    continueWithOneParent: () =>
      page.getByRole("button", { name: "Continue" }).click(),
    fillName: (name: string) => page.getByLabel(/^name/i).fill(name),
    expectName: (name: string) =>
      expect(page.getByLabel(/^name/i)).toHaveValue(name),
    expectNature: (label: string) =>
      expect(page.getByRole("combobox", { name: /^Nature/ })).toHaveText(label),
    selectNature: async (label: string) => {
      await page.getByRole("combobox", { name: /nature/i }).click();
      await page.getByRole("option", { name: label }).click();
    },
    attachManualGroup: (name: string) =>
      attachManualGroup(page, "Groups this sample belongs to", name),
    submit: () =>
      page.getByRole("button", { name: "Save", exact: true }).click(),
  };
}
