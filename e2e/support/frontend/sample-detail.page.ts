import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleDetailPage(page: Page) {
  return {
    goto: (igsn: string) => page.goto(`${frontendUrl}/samples/${igsn}`),
    expectSample: async (name: string, igsn: string) => {
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText(igsn)).toBeVisible();
    },
    expectNature: async (label: string) => {
      await expect(page.getByText("Nature")).toBeVisible();
      await expect(page.getByText(label)).toBeVisible();
    },
    expectDoiLink: async (url: string, description: string) => {
      const link = page.getByRole("link", { name: url });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", url);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(page.getByText(description)).toBeVisible();
    },
    expectDeclaredBy: (owner: string) =>
      expect(
        page.getByText(new RegExp(`Declared in \\d{4} by ${owner}`)),
      ).toBeVisible(),
    expectNoHorizontalOverflow: () =>
      expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        )
        .toBeLessThanOrEqual(0),
    // ponytail: hydration scrolls back to top ~1s after load and swallows the first tap, so retry until the dialog opens
    openContactForm: () =>
      expect(async () => {
        await page
          .getByRole("button", { name: "Contact the record owner" })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Contact the record owner" }),
        ).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 }),
    // ponytail: the toast is asserted first, since it auto-dismisses a few seconds after the dialog closes
    expectContactSent: async () => {
      await expect(
        page.getByText("Your message has been sent to the record owner."),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    },
    expectManualGroup: (name: string) =>
      expect(
        page.getByRole("region", { name: "Groups" }).getByText(name),
      ).toBeVisible(),
    expectAttachment: (name: string) =>
      expect(page.getByText(name, { exact: true })).toBeVisible(),
    attachmentDownloadHref: (name: string) =>
      page.getByRole("link", { name: `Download ${name}` }).getAttribute("href"),
  };
}
