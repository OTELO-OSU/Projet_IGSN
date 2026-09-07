import { expect, type Locator, type Page } from "@playwright/test";

import { pickHierarchyLevel } from "../pick-hierarchy.ts";

export function sampleFormPage(page: Page) {
  const openTab = (name: string) => page.getByRole("tab", { name }).click();
  const fieldCombobox = (field: string, scope: Locator | Page = page) =>
    scope.getByRole("combobox", {
      name: new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    });
  const pick = async (
    field: string,
    label: string,
    scope: Locator | Page = page,
  ) => {
    const combobox = fieldCombobox(field, scope);
    await expect(async () => {
      if ((await combobox.innerText()).trim() !== label) {
        await combobox.click();
        await page.getByRole("option", { name: label, exact: true }).click();
      }
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await expect(combobox).toHaveText(label, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  };

  const pickHierarchy = (field: string, label: string) =>
    pickHierarchyLevel(page, fieldCombobox(field), label);

  const confirm = (dialog: string) =>
    page
      .getByRole("dialog", { name: dialog })
      .getByRole("button", { name: "Confirm" })
      .click();
  const confirmStatusChange = async (action: string, dialog: string) => {
    await page.getByRole("button", { name: action, exact: true }).click();
    await confirm(dialog);
  };

  return {
    openTab,
    pick,
    confirm,
    confirmStatusChange,

    fillPublishableFields: async () => {
      await pickHierarchy("Type", "Dredge");
      await pick("Provenance status", "Collection specimen");
      await page
        .getByRole("group", { name: /collection date/i })
        .getByRole("textbox", { name: /^Date/ })
        .fill("2025-06-15");
      await openTab("Sample classification");
      await pickHierarchy("Material", "Synthetic rock / mineral");
      await openTab("Scientific context");
      await page.getByLabel(/collection curator/i).fill("Paul Bernard");
      await pick("Collection origin", "Scientific expedition");
      await openTab("Curation and repository");
      await pick("Existence status", "Exists");
      await pick("Availability status", "Available");
      await pick(
        "Current archive",
        "Centre National de la Recherche Scientifique (CNRS)",
      );
      await openTab("Sample classification");
      await pick("Starting material", "Natural");
      await pick("Nature of starting material", "Powder");
      await pick("Final product", "Glass");
      await page.getByRole("switch", { name: "Duration not relevant" }).click();
      await page
        .getByRole("group", { name: /synthesis date/i })
        .getByRole("textbox", { name: /^Date/ })
        .fill("2025-06-15");
      await page.getByLabel(/operator name/i).fill("Paul Bernard");
    },
    publish: () => confirmStatusChange("Publish", "Publish sample"),
    publishAsWithdrawn: async () => {
      await page
        .getByRole("button", { name: "More publishing options" })
        .click();
      await page
        .getByRole("menuitem", { name: "Withdraw", exact: true })
        .click();
      await confirm("Publish sample as withdrawn");
    },
  };
}
