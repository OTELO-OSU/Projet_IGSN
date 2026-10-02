import { expect, type Page } from "@playwright/test";

export const sampleRow = (page: Page, name: string) =>
  page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name, exact: true }) });

export function sampleListPage(page: Page) {
  const openRowMenu = (name: string) =>
    page.getByRole("button", { name: `Actions for ${name}` }).click();

  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "My samples" })).toBeVisible(),
    expectHidden: () =>
      expect(page.getByRole("heading", { name: "My samples" })).toBeHidden(),
    goToCreate: () => page.getByRole("link", { name: "Create" }).click(),
    exportAllSamples: async () => {
      await page.getByRole("button", { name: "Bulk edit" }).click();
      const download = page.waitForEvent("download");
      await page
        .getByRole("dialog", { name: "Bulk edit" })
        .getByRole("button", { name: "Export samples" })
        .click();
      return download;
    },
    openSample: (name: string) =>
      page.getByRole("link", { name, exact: true }).click(),
    addSubSample: async (name: string) => {
      await openRowMenu(name);
      await page
        .getByRole("menuitem", { name: `Add a sub sample of ${name}` })
        .click();
    },
    expectNoSubSampleAction: async (name: string) => {
      await openRowMenu(name);
      await expect(page.getByRole("menu")).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: `Add a sub sample of ${name}` }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
    expectColumns: async () => {
      for (const name of [
        "IGSN",
        "Name",
        "Status",
        "Type",
        "Material",
        "Location",
        "Collector",
        "Actions",
      ]) {
        await expect(
          page.getByRole("columnheader", { name, exact: true }),
        ).toBeVisible();
      }
    },
    filterByOwnership: async (
      choice: "All samples" | "Mine" | "Shared with me",
    ) => {
      await page.getByRole("combobox", { name: "Ownership" }).click();
      await page.getByRole("option", { name: choice }).click();
    },
    expectSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name, exact: true })).toBeVisible(),
    expectNoSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name, exact: true })).toBeHidden(),
    expectEmpty: () =>
      expect(page.getByRole("cell", { name: "No results" })).toBeVisible(),
    expectSampleRowWithStatus: (name: string, status: string) =>
      expect(
        sampleRow(page, name).getByRole("cell", { name: status, exact: true }),
      ).toBeVisible(),
  };
}
