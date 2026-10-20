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
    filterByOwnership: async (
      choice: "All samples" | "Mine" | "Shared with me",
    ) => {
      await page.getByRole("combobox", { name: "Ownership" }).click();
      await page.getByRole("option", { name: choice }).click();
    },
    stubPrint: () =>
      page.addInitScript(() => {
        window.print = () => {};
      }),
    selectSample: (name: string) =>
      sampleRow(page, name)
        .getByRole("cell")
        .first()
        .click({ position: { x: 2, y: 2 } }),
    printLabels: async (size: string) => {
      await page
        .getByRole("region", { name: "Bulk actions" })
        .getByRole("button", { name: "Print labels" })
        .click();
      await page.getByRole("menuitem", { name: size, exact: true }).click();
      await page.emulateMedia({ media: "print" });
    },
    expectLabel: (igsn: string, name: string) =>
      expect(
        page
          .getByRole("list", { name: "Print labels" })
          .getByRole("listitem")
          .filter({ hasText: igsn }),
      ).toContainText(name),
    expectSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name, exact: true })).toBeVisible(),
    expectNoSampleRow: (name: string) =>
      expect(page.getByRole("cell", { name, exact: true })).toBeHidden(),
  };
}
