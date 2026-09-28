import { expect, type Page } from "@playwright/test";

export const sampleRow = (page: Page, name: string) =>
  page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name, exact: true }) });

export function sampleListPage(page: Page) {
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
    addSubSample: (name: string) =>
      page.getByRole("link", { name: `Add a sub sample of ${name}` }).click(),
    expectNoSubSampleAction: (name: string) =>
      expect(
        page.getByRole("link", { name: `Add a sub sample of ${name}` }),
      ).toHaveCount(0),
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
