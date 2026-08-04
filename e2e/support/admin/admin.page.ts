import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

// The admin SPA: the login screen (a single sign-in button; the provider
// choice happens on Keycloak's page, see keycloak-login.page.ts) and, once
// authenticated, the header with the sign-out control.
export function adminPage(page: Page) {
  return {
    goto: () => page.goto(`${adminUrl}/`),
    signIn: () => page.getByRole("button", { name: "Sign in" }).click(),
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
