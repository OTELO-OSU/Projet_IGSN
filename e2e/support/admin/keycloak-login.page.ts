import { type Page } from "@playwright/test";

// The Keycloak login page the app's single sign-in button lands on: a local
// username/password form plus one link per identity provider. Provider names
// mirror what the GaiaData SSO shows ("eduGAIN", "ORCID").
export function keycloakLoginPage(page: Page) {
  return {
    chooseInstitution: () =>
      page.getByRole("link", { name: "eduGAIN" }).click(),
    chooseOrcid: () => page.getByRole("link", { name: "ORCID" }).click(),
  };
}
