import { expect, type Page } from "@playwright/test";

import { natureLabel } from "../nature-label";

export function sampleListPage(page: Page) {
  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "Samples" })).toBeVisible(),
    expectHidden: () =>
      expect(page.getByRole("heading", { name: "Samples" })).toBeHidden(),
    goToCreate: () => page.getByRole("link", { name: "Create" }).click(),
    openSample: (name: string) => page.getByRole("link", { name }).click(),
    expectColumns: async () => {
      await expect(
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
    filterByOwnership: async (
      choice: "All samples" | "Mine" | "Shared with me",
    ) => {
      await page.getByRole("combobox", { name: "Ownership" }).click();
      await page.getByRole("option", { name: choice }).click();
    },
    expectSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name })).toBeVisible(),
    expectNoSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name })).toBeHidden(),
    expectEmpty: () =>
      expect(page.getByRole("cell", { name: "No results" })).toBeVisible(),
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
