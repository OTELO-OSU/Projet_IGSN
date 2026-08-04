import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

export function adminPage(page: Page) {
  return {
    goto: () => page.goto(`${adminUrl}/`),
    signInWithInstitution: () =>
      page
        .getByRole("button", { name: "Sign in with your institution" })
        .click(),
    signInWithOrcid: () =>
      page.getByRole("button", { name: "Sign in with ORCID" }).click(),
    signOut: () => page.getByRole("button", { name: "Sign out" }).click(),
    // An ORCID sign-in whose orcid no account declared is authenticated but
    // denied app access (see docs/adr/0020-app-level-orcid-linking.md).
    expectNoAccess: () =>
      expect(page.getByRole("alert")).toContainText(
        /not linked to an account/i,
      ),
    expectSignedIn: () =>
      expect(page.getByRole("button", { name: "Sign out" })).toBeVisible(),
    // The header name is filled from the api's protected /me route, so seeing it
    // proves the Keycloak token verified server-side, not just in the SPA.
    expectUserName: (name: string) =>
      expect(page.getByRole("banner").getByText(name)).toBeVisible(),
  };
}
