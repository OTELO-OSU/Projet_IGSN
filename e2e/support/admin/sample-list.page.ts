import { expect, type Page } from "@playwright/test";

import { natureLabel } from "../nature-label";

export const sampleRow = (page: Page, name: string) =>
  page.getByRole("row").filter({ has: page.getByRole("cell", { name }) });

export function sampleListPage(page: Page) {
  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "My samples" })).toBeVisible(),
    expectHidden: () =>
      expect(page.getByRole("heading", { name: "My samples" })).toBeHidden(),
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
    expectSampleRowWithNature: (name: string, nature: string) =>
      expect(
        sampleRow(page, name).getByRole("cell", { name: natureLabel(nature) }),
      ).toBeVisible(),
  };
}
