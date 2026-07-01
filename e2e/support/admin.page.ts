import { expect, type Page } from "@playwright/test";

// The admin SPA: the login screen (provider buttons) and, once authenticated,
// the header with the sign-out control.
export function adminPage(page: Page) {
  return {
    goto: () => page.goto("/"),
    signInWithInstitution: () =>
      page
        .getByRole("button", { name: "Sign in with your institution" })
        .click(),
    signInWithOrcid: () =>
      page.getByRole("button", { name: "Sign in with ORCID" }).click(),
    expectSignedIn: () =>
      expect(page.getByRole("button", { name: "Sign out" })).toBeVisible(),
  };
}
