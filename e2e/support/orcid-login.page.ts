import { type Page } from "@playwright/test";

// The ORCID (OIDC) login page — in dev, the mock-orcid Keycloak realm.
export function orcidLoginPage(page: Page) {
  return {
    login: async (orcidId: string, password: string) => {
      await page.getByRole("textbox", { name: /username/i }).fill(orcidId);
      await page
        .getByRole("textbox", { name: "Password", exact: true })
        .fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
    },
  };
}
