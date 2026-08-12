import { expect, type Page } from "@playwright/test";

// Provider names mirror what the GaiaData SSO shows ("eduGAIN", "ORCID").
export function keycloakLoginPage(page: Page) {
  return {
    chooseInstitution: () =>
      page.getByRole("link", { name: "eduGAIN" }).click(),
    chooseOrcid: () => page.getByRole("link", { name: "ORCID" }).click(),
    // A Keycloak-local account, brokered by no IdP, like a Gaia Data self-registration.
    loginLocally: async (username: string, password: string) => {
      await page.getByLabel(/username/i).fill(username);
      // Keycloak's "Show password" toggle also matches /password/i, so scope to
      // the textbox to avoid a strict-mode clash.
      await page.getByRole("textbox", { name: /password/i }).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
    },
    expectCredentialsPrompt: () =>
      expect(page.getByLabel(/username/i)).toBeVisible(),
  };
}
