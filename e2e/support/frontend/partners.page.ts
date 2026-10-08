import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function partnersPage(page: Page) {
  const partnersLink = page
    .getByRole("banner")
    .getByRole("link", { name: "Partners", exact: true });
  const menuButton = page
    .getByRole("banner")
    .getByRole("button", { name: "Menu" });
  return {
    gotoHome: () => page.goto(frontendUrl),
    // ponytail: hydration swallows the first tap, so retry until the menu opens
    openMenu: () =>
      expect(async () => {
        await menuButton.click();
        await expect(menuButton).toHaveAttribute("aria-expanded", "true", {
          timeout: 2_000,
        });
      }).toPass({ timeout: 20_000 }),
    followNavLink: () => partnersLink.click(),
    expectPage: async () => {
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "A collaboration in the service of science",
        }),
      ).toBeVisible();
      await expect(partnersLink).toHaveAttribute("aria-current", "page");
    },
    expectNoHorizontalScroll: async () =>
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true),
    expectPartner: (name: string, role: string) =>
      expect(
        page
          .getByRole("listitem")
          .filter({ has: page.getByRole("heading", { level: 2, name }) }),
      ).toContainText(role),
  };
}
