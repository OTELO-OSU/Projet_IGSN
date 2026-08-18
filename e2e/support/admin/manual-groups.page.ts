import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

export function manualGroupsPage(page: Page) {
  const menuEntry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Manual groups" });
  const row = (name: string) =>
    page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name, exact: true }) });

  return {
    goto: () => page.goto(`${adminUrl}/manual-groups`),
    open: () => menuEntry.click(),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Manual groups", level: 1 }),
      ).toBeVisible(),
    expectNoMenuEntry: () => expect(menuEntry).toBeHidden(),
    create: async (name: string) => {
      const dialog = page.getByRole("dialog", { name: "New manual group" });
      await page.getByRole("button", { name: "New manual group" }).click();
      await dialog.getByRole("textbox", { name: "Group name" }).fill(name);
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      await expect(dialog).toBeHidden();
    },
    search: (term: string) =>
      page.getByRole("searchbox", { name: "Search manual groups" }).fill(term),
    openGroup: (name: string) =>
      page.getByRole("link", { name, exact: true }).click(),
    expectGroupRow: (name: string, memberCount: number) =>
      expect(
        row(name).getByRole("cell", { name: String(memberCount), exact: true }),
      ).toBeVisible(),
    expectNoGroupRow: (name: string) => expect(row(name)).toHaveCount(0),
  };
}
