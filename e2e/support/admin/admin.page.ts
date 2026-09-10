import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

export const signedInLocator = (page: Page) =>
  page
    .getByRole("banner")
    .getByRole("link", { name: "Go to public site" })
    .or(page.getByRole("button", { name: "Sign out" }));

export function adminPage(page: Page) {
  const banner = page.getByRole("banner");
  const userMenu = banner.getByRole("button");

  return {
    goto: async () => {
      await page.goto(`${adminUrl}/`);
      await page.waitForURL(/\/realms\//);
    },
    signIn: () => page.getByRole("button", { name: "Sign in" }).click(),
    signOut: async () => {
      if (await banner.isVisible()) {
        await userMenu.click();
        await page.getByRole("menuitem", { name: "Sign out" }).click();
        return;
      }
      await page.getByRole("button", { name: "Sign out" }).click();
    },
    expectNoAccess: () =>
      expect(page.getByRole("alert")).toContainText(
        /not linked to an account/i,
      ),
    expectUnsupportedProvider: () =>
      expect(page.getByRole("alert")).toContainText(/eduGAIN.*ORCID iD/is),
    expectSignedIn: () => expect(signedInLocator(page).first()).toBeVisible(),
    expectSignedOut: () =>
      expect(page.getByRole("button", { name: "Sign in" })).toBeVisible(),
    expectUserName: (name: string) =>
      expect(banner.getByText(name)).toBeVisible(),
  };
}
