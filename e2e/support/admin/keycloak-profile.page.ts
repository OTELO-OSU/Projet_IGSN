import { expect, type Page } from "@playwright/test";

// Keycloak's first-broker-login "review profile" step for institution logins.
// It only appears the first time an account signs in; on later logins the user
// lands straight in the app. Handle both so the test is repeatable. ORCID
// logins never see it (custom flow, see keycloak/realm-igsn.json).
export function keycloakProfilePage(page: Page) {
  return {
    completeIfShown: async (email: string) => {
      const heading = page.getByRole("heading", {
        name: "Update Account Information",
      });
      const signedIn = page.getByRole("button", { name: "Sign out" });
      await expect(heading.or(signedIn).first()).toBeVisible();
      if (await heading.isVisible()) {
        await page.getByRole("textbox", { name: /email/i }).fill(email);
        await page.getByRole("button", { name: /submit/i }).click();
      }
    },
  };
}
