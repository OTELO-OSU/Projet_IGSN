import { expect, type Page } from "@playwright/test";

export function manualGroupPage(page: Page) {
  const memberRow = (email: string) =>
    page.getByRole("row").filter({ hasText: email });
  const associateDialog = page.getByRole("dialog", {
    name: "Associate a user",
  });
  const searchUser = async (search: string) => {
    await page.getByRole("button", { name: "Associate a user" }).click();
    await associateDialog.getByRole("combobox", { name: "User" }).click();
    await page.getByPlaceholder("Search by name or email").fill(search);
  };

  return {
    associate: async (search: string, email: string) => {
      await searchUser(search);
      await page.getByRole("option").filter({ hasText: email }).click();
      await associateDialog
        .getByRole("button", { name: "Associate", exact: true })
        .click();
      await expect(associateDialog).toBeHidden();
    },
    expectMember: (email: string, status: string) =>
      expect(memberRow(email)).toContainText(status),
  };
}
