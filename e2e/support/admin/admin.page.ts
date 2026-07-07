import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";

// The admin SPA: the login screen (provider buttons) and, once authenticated,
// the header with the sign-out control.
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
    // ORCID cold-start accounts are authenticated but denied app access until
    // ORCID linking ships (see docs/adr/0002-production-auth-keycloak.md).
    expectNoAccess: () =>
      expect(page.getByRole("alert")).toContainText(/do not have access/i),
    expectSignedIn: () =>
      expect(page.getByRole("button", { name: "Sign out" })).toBeVisible(),
    // The header name is filled from the api's protected /me route, so seeing it
    // proves the Keycloak token verified server-side, not just in the SPA.
    expectUserName: (name: string) =>
      expect(page.getByText(name)).toBeVisible(),
  };
}
