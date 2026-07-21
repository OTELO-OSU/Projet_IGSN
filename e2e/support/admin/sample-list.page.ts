import { expect, type Page } from "@playwright/test";

import { natureLabel } from "../nature-label";

export function sampleListPage(page: Page) {
  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "Samples" })).toBeVisible(),
    goToCreate: () => page.getByRole("link", { name: "Create" }).click(),
    openSample: (name: string) => page.getByRole("link", { name }).click(),
    expectColumns: async () => {
      await expect(
        // Exact: "Specific Name" also contains "Name".
        page.getByRole("columnheader", { name: "Name", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Specific Name" }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Nature" }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Last modified" }),
      ).toBeVisible();
    },
    expectSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name })).toBeVisible(),
    // Assert the row shows both the sample name and its nature label in the same
    // row, so a mismatched nature can't pass unnoticed.
    expectSampleRowWithNature: async (name: string, nature: string) => {
      const row = page
        .getByRole("row")
        .filter({ has: page.getByRole("cell", { name }) });
      await expect(
        row.getByRole("cell", { name: natureLabel(nature) }),
      ).toBeVisible();
    },
  };
}
