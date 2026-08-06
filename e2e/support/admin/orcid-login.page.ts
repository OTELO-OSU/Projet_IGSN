import { expect, type Page } from "@playwright/test";

// The ORCID login page — in dev, the "mock-orcid" Keycloak realm, whose
// login form asks for the ORCID iD (realm localization override), like the
// real ORCID does.
export function orcidLoginPage(page: Page) {
  return {
    login: async (orcid: string, password: string) => {
      await page.getByLabel(/orcid id/i).fill(orcid);
      // Keycloak's password field ships a "Show password" toggle whose aria-label
      // also matches /password/i, so scope to the textbox to avoid a strict-mode clash.
      await page.getByRole("textbox", { name: /password/i }).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
    },
    // Proves the IdP session ended: it asks for credentials again.
    expectCredentialsPrompt: () =>
      expect(page.getByLabel(/orcid id/i)).toBeVisible(),
  };
}
