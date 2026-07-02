import { type Page } from "@playwright/test";

// The ORCID login page — in dev, the "mock-orcid" Keycloak realm, so it is a
// standard Keycloak username/password form.
export function orcidLoginPage(page: Page) {
  return {
    login: async (username: string, password: string) => {
      await page.getByLabel(/username/i).fill(username);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
    },
  };
}
