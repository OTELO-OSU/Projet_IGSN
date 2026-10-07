import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function homePage(page: Page) {
  return {
    goto: () => page.goto(frontendUrl),
    expectCounters: async () => {
      await expect(page.getByText(/^[\d,]+ samples declared$/)).toBeVisible();
      await expect(page.getByText(/^[\d,]+ users$/)).toBeVisible();
    },
    learnMore: () => page.getByRole("link", { name: "Learn more" }).click(),
    expectFaq: () =>
      expect(
        page.getByRole("heading", { name: "Frequently asked questions" }),
      ).toBeVisible(),
    // ponytail: hydration swallows the first tap, so retry until keycloak takes over
    recordFirstSamples: () =>
      expect(async () => {
        await page
          .getByRole("button", { name: "Record my first samples" })
          .click();
        await page.waitForURL(/\/realms\//, { timeout: 2_000 });
      }).toPass({ timeout: 20_000 }),
  };
}
