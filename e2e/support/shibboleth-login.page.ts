import { type Page } from "@playwright/test";

// The institution (Shibboleth/SAML) login page — in dev, the SimpleSAMLphp IdP.
export function shibbolethLoginPage(page: Page) {
  return {
    login: async (username: string, password: string) => {
      await page.getByLabel(/username/i).fill(username);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /login/i }).click();
    },
  };
}
