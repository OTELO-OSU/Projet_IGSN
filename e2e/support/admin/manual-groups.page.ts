import { expect, type Page } from "@playwright/test";

export function manualGroupsPage(page: Page) {
  const menuEntry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Manual groups" });
  return {
    open: () => menuEntry.click(),
    create: async (name: string) => {
      const dialog = page.getByRole("dialog", { name: "New manual group" });
      await page.getByRole("button", { name: "New manual group" }).click();
      await dialog.getByRole("textbox", { name: "Group name" }).fill(name);
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      await expect(dialog).toBeHidden();
    },
    openGroup: (name: string) =>
      page.getByRole("link", { name, exact: true }).click(),
  };
}
