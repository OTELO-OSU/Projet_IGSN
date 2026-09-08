import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

export function adminPage(page: Page) {
  return {
    goto: async () => {
      await page.goto(`${adminUrl}/`);
      await page.waitForURL(/\/realms\//);
    },
    gotoSignedIn: async () => {
      await page.goto(`${adminUrl}/`);
      await expect(
        page.getByRole("button", { name: "Sign out" }),
      ).toBeVisible();
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
    expectSignedOut: () =>
      expect(page.getByRole("button", { name: "Sign in" })).toBeVisible(),
    readAccessToken: () =>
      page.evaluate(() => {
        const key = Object.keys(sessionStorage).find((candidate) =>
          candidate.startsWith("oidc.user:"),
        );
        const stored = key === undefined ? null : sessionStorage.getItem(key);
        if (stored === null) {
          throw new Error("no oidc session stored in this tab");
        }
        return (JSON.parse(stored) as { access_token: string }).access_token;
      }),
    expectUserName: (name: string) =>
      expect(page.getByRole("banner").getByText(name)).toBeVisible(),
  };
}
