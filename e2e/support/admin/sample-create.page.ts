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
    expectSubSampleVisible: (parentName: string) =>
      expect(
        page.getByRole("heading", {
          name: `Create sub sample of ${parentName}`,
        }),
      ).toBeVisible(),
    expectTwoParentSubSampleVisible: (first: string, second: string) =>
      expect(
        page.getByRole("heading", {
          name: `Create sub sample of ${first} and ${second}`,
        }),
      ).toBeVisible(),
    continueWithOneParent: () =>
      page.getByRole("button", { name: "Continue" }).click(),
    continueWithSecondParent: async (name: string) => {
      await page.getByLabel("Second parent (optional)").click();
      await page.getByPlaceholder("Search by name or IGSN").fill(name);
      await page.getByRole("option", { name: new RegExp(name) }).click();
      await page.getByRole("button", { name: "Continue" }).click();
    },
    fillFromParent: (source: string, value: string) =>
      page.getByRole("button", { name: `${source}: ${value}` }).click(),
    expectParentSlots: async (
      filled: { source: string; value: string },
      emptySource: string,
    ) => {
      const slots = page
        .getByRole("list", { name: "Values from the parent samples" })
        .filter({
          has: page.getByRole("button", {
            name: `${filled.source}: ${filled.value}`,
          }),
        });
      await expect(
        slots.getByRole("button", { name: `${emptySource}: No value` }),
      ).toBeDisabled();
    },
    expectOriented: async (explanation: string) => {
      await expect(
        page.getByRole("switch", { name: "Oriented sample" }),
      ).toBeChecked();
      await expect(page.getByLabel("Orientation explanation")).toHaveValue(
        explanation,
      );
    },
    expectMaterialLockedToSynthetic: async () => {
      await expect(page.getByText("Synthetic rock / mineral")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Remove Synthetic rock / mineral" }),
      ).toHaveCount(0);
    },
    expectNoLocationTab: () =>
      expect(page.getByRole("tab", { name: "Location" })).toBeDisabled(),
    fillName: (name: string) => page.getByLabel(/name/i).fill(name),
    expectName: (name: string) =>
      expect(page.getByLabel(/name/i)).toHaveValue(name),
    expectNatureEmpty: () =>
      expect(page.getByRole("combobox", { name: /^Nature/ })).toHaveText(
        "Select a nature",
      ),
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
