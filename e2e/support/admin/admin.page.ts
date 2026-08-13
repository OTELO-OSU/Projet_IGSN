import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

export function adminPage(page: Page) {
  return {
    goto: async () => {
      await page.goto(`${adminUrl}/`);
      await page.waitForURL(/\/realms\//);
    },
    signIn: () => page.getByRole("button", { name: "Sign in" }).click(),
    signOut: () => page.getByRole("button", { name: "Sign out" }).click(),
    expectNoAccess: () =>
      expect(page.getByRole("alert")).toContainText(
        /not linked to an account/i,
      ),
    expectUnsupportedProvider: () =>
      expect(page.getByRole("alert")).toContainText(/eduGAIN.*ORCID iD/is),
    expectSignedIn: () =>
      expect(page.getByRole("button", { name: "Sign out" })).toBeVisible(),
    expectUserName: (name: string) =>
      expect(page.getByRole("banner").getByText(name)).toBeVisible(),
  };
}
