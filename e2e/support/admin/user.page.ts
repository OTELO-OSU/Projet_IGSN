import { expect, type Page } from "@playwright/test";

export function userPage(page: Page) {
  const groupsField = page.getByRole("combobox", { name: "Manual groups" });

  return {
    expectVisible: (email: string) =>
      expect(page.getByText(email)).toBeVisible(),
    associateGroup: async (name: string) => {
      await groupsField.click();
      await page.getByPlaceholder("Search by name").fill(name);
      await page.getByRole("option", { name, exact: true }).click();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Save" }).click();
    },
    expectGroup: (name: string) =>
      expect(
        page.getByRole("button", { name: `Detach ${name}` }),
      ).toBeVisible(),
  };
}
