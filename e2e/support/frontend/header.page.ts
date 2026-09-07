import { expect, type Page } from "@playwright/test";

export function headerPage(page: Page) {
  const banner = page.getByRole("banner");
  const editLink = page.getByRole("link", { name: "Edit", exact: true });
  return {
    // ponytail: hydration scrolls back to top ~1s after load and swallows the first tap, so retry until keycloak takes over
    signIn: () =>
      expect(async () => {
        await banner.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL(/\/realms\//, { timeout: 2_000 });
      }).toPass({ timeout: 20_000 }),
    signOut: () => banner.getByRole("button", { name: "Sign out" }).click(),
    expectSignedIn: () =>
      expect(banner.getByRole("button", { name: "Sign out" })).toBeVisible(),
    expectSignedOut: () =>
      expect(banner.getByRole("button", { name: "Sign in" })).toBeVisible(),
    goToAdminHref: () =>
      banner
        .getByRole("link", { name: "Go to admin" })
        .getAttribute("href", { timeout: 10_000 }),
    editHref: () => editLink.getAttribute("href", { timeout: 10_000 }),
    accessAnswered: (sampleId: string) =>
      page.waitForResponse((res) =>
        res.url().includes(`/admin/samples/${sampleId}`),
      ),
    expectNoEditLink: () => expect(editLink).toHaveCount(0),
  };
}
