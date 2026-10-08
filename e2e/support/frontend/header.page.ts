import { expect, type Locator, type Page } from "@playwright/test";

export function headerPage(page: Page) {
  const banner = page.getByRole("banner");
  const menuButton = banner.getByRole("button", { name: "Menu" });
  const signInButton = banner.getByRole("button", { name: "Sign in" });
  const signOutButton = banner.getByRole("button", { name: "Sign out" });
  const editLink = page.getByRole("link", { name: "Edit", exact: true });
  // ponytail: the menu exists only on small screens, hydration swallows the first tap and a redirect reloads it closed, so retry until the target shows
  const showInMenu = (target: Locator) =>
    expect(async () => {
      if (
        (await menuButton.isVisible()) &&
        (await menuButton.getAttribute("aria-expanded")) !== "true"
      ) {
        await menuButton.click();
      }
      await expect(target).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  return {
    // ponytail: hydration scrolls back to top ~1s after load and swallows the first tap, so retry until keycloak takes over
    signIn: async () => {
      await showInMenu(signInButton);
      await expect(async () => {
        await signInButton.click();
        await page.waitForURL(/\/realms\//, { timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
    },
    signOut: async () => {
      await showInMenu(signOutButton);
      await signOutButton.click();
    },
    expectSignedIn: () => showInMenu(signOutButton),
    expectSignedOut: () => showInMenu(signInButton),
    expectGoToDashboardHref: async (href: string) => {
      const dashboardLink = banner.getByRole("link", {
        name: "Go to Dashboard",
      });
      await showInMenu(dashboardLink);
      await expect(dashboardLink).toHaveAttribute("href", href);
    },
    expectEditHref: (href: string) =>
      expect(editLink).toHaveAttribute("href", href),
    accessAnswered: (sampleId: string) =>
      page.waitForResponse((res) =>
        res.url().includes(`/admin/samples/${sampleId}`),
      ),
    expectNoEditLink: () => expect(editLink).toHaveCount(0),
  };
}
