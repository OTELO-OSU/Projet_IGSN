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
    expectVisible: (name: string) =>
      expect(page.getByRole("heading", { name, level: 1 })).toBeVisible(),
    associate: async (search: string, email: string) => {
      await searchUser(search);
      await page.getByRole("option").filter({ hasText: email }).click();
      await associateDialog
        .getByRole("button", { name: "Associate", exact: true })
        .click();
      await expect(associateDialog).toBeHidden();
    },
    expectNoSuggestion: async (search: string) => {
      await searchUser(search);
      await expect(page.getByText("No colleague found")).toBeVisible();
      await page.keyboard.press("Escape");
      await associateDialog.getByRole("button", { name: "Cancel" }).click();
      await expect(associateDialog).toBeHidden();
    },
    expectMember: (email: string, status: string) =>
      expect(memberRow(email)).toContainText(status),
    expectNoMember: (email: string) => expect(memberRow(email)).toHaveCount(0),
    expectNothingAbout: (text: string) =>
      expect(page.getByText(text)).toBeHidden(),
    detach: async (name: string) => {
      await page.getByRole("button", { name: `Detach ${name}` }).click();
      await page
        .getByRole("dialog", { name: "Detach this member?" })
        .getByRole("button", { name: "Detach", exact: true })
        .click();
    },
    rename: async (name: string) => {
      const dialog = page.getByRole("dialog", {
        name: "Rename this manual group",
      });
      await page.getByRole("button", { name: "Rename this group" }).click();
      await dialog.getByRole("textbox", { name: "Group name" }).fill(name);
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog).toBeHidden();
    },
    remove: async () => {
      const dialog = page.getByRole("dialog", {
        name: "Delete this manual group?",
      });
      await page.getByRole("button", { name: "Delete this group" }).click();
      await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    },
  };
}
