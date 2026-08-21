import { expect, type Page } from "@playwright/test";

export function usersPage(page: Page) {
  const menuEntry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Users" });
  const row = (email: string) =>
    page.getByRole("row").filter({ hasText: email });

  return {
    open: () => menuEntry.click(),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Users", level: 1 }),
      ).toBeVisible(),
    openUser: (email: string) => row(email).getByRole("link").click(),
    expectGroup: (email: string, group: string) =>
      expect(row(email)).toContainText(group),
    expectListed: (email: string) => expect(row(email)).toBeVisible(),
    expectNotListed: (email: string) => expect(row(email)).toHaveCount(0),
  };
}
