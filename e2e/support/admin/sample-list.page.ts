import { expect, type Page } from "@playwright/test";

export function sampleListPage(page: Page) {
  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "Samples" })).toBeVisible(),
    goToCreate: () => page.getByRole("link", { name: "Create" }).click(),
    expectColumns: async () => {
      await expect(
        page.getByRole("columnheader", { name: "Name" }),
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
  };
}
