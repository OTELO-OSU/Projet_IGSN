import { expect, type Page } from "@playwright/test";

// The Settings page: reached from the header link, holds the ORCID iD form.
export function settingsPage(page: Page) {
  return {
    open: async () => {
      await page.getByRole("link", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { name: "Settings" }),
      ).toBeVisible();
    },
    setOrcid: async (orcid: string) => {
      await page.getByLabel("ORCID iD").fill(orcid);
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("ORCID iD saved")).toBeVisible();
    },
    expectManualGroup: (name: string) =>
      expect(
        page.getByRole("listitem").filter({ hasText: name }),
      ).toBeVisible(),
    expectNoManualGroupEditControl: async () => {
      await expect(
        page.getByRole("textbox", { name: "Group name" }),
      ).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Associate a user" }),
      ).toBeHidden();
    },
  };
}
