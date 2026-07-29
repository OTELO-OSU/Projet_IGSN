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
  };
}
