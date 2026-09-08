import { expect, type Page } from "@playwright/test";

export function headerPage(page: Page) {
  const banner = page.getByRole("banner");
  const editLink = page.getByRole("link", { name: "Edit", exact: true });
  const requestDialog = page.getByRole("dialog", {
    name: "Ask for a service account",
  });
  return {
    // ponytail: hydration scrolls back to top ~1s after load and swallows the first tap, so retry until keycloak takes over
    signIn: () =>
      expect(async () => {
        await banner.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL(/\/realms\//, { timeout: 2_000 });
      }).toPass({ timeout: 20_000 }),
    signInWithExistingSession: () =>
      expect(async () => {
        const signInButton = banner.getByRole("button", { name: "Sign in" });
        if (await signInButton.isVisible()) {
          await signInButton.click();
        }
        await expect(
          banner.getByRole("button", { name: "Sign out" }),
        ).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 30_000 }),
    signOut: () => banner.getByRole("button", { name: "Sign out" }).click(),
    expectSignedIn: () =>
      expect(banner.getByRole("button", { name: "Sign out" })).toBeVisible(),
    expectSignedOut: () =>
      expect(banner.getByRole("button", { name: "Sign in" })).toBeVisible(),
    expectGoToAdminHref: (href: string) =>
      expect(banner.getByRole("link", { name: "Go to admin" })).toHaveAttribute(
        "href",
        href,
      ),
    expectEditHref: (href: string) =>
      expect(editLink).toHaveAttribute("href", href),
    accessAnswered: (sampleId: string) =>
      page.waitForResponse((res) =>
        res.url().includes(`/admin/samples/${sampleId}`),
      ),
    expectNoEditLink: () => expect(editLink).toHaveCount(0),
    requestServiceAccount: async (name: string, manualGroup: string) => {
      await expect(async () => {
        await banner
          .getByRole("button", { name: "Ask for a service account" })
          .click();
        await expect(requestDialog).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 20_000 });
      await requestDialog
        .getByRole("textbox", { name: "Service name" })
        .fill(name);
      await requestDialog
        .getByRole("combobox", { name: "Groups to access" })
        .click();
      await page.getByRole("option", { name: manualGroup }).click();
      await page.keyboard.press("Escape");
      await requestDialog.getByRole("button", { name: "Send request" }).click();
      await expect(
        page.getByText(
          "Your request was sent to the super admin and is being processed.",
        ),
      ).toBeVisible();
    },
  };
}
