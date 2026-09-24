import { expect, type Page } from "@playwright/test";

export function usersPage(page: Page) {
  const menuEntry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Users" });
  const row = (email: string) =>
    page.getByRole("row").filter({ hasText: email });
  const search = async (term: string) => {
    const searchbox = page.getByRole("searchbox", { name: "Search users" });
    await searchbox.fill(term);
    await searchbox.press("Enter");
  };

  return {
    open: () => menuEntry.click(),
    expectNoMenuEntry: () => expect(menuEntry).toBeHidden(),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Users", level: 1 }),
      ).toBeVisible(),
    openUser: async (email: string) => {
      await search(email);
      await row(email).getByRole("link").click();
    },
    expectGroup: async (email: string, group: string) => {
      await search(email);
      await expect(row(email)).toContainText(group);
    },
    expectListed: (email: string) => expect(row(email)).toBeVisible(),
    expectNotListed: (email: string) => expect(row(email)).toHaveCount(0),
  };
}
