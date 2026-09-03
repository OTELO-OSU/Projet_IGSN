import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleDetailPage(page: Page) {
  return {
    goto: (igsn: string) => page.goto(`${frontendUrl}/samples/${igsn}`),
    expectSample: async (name: string, igsn: string) => {
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText(igsn)).toBeVisible();
    },
    expectNotFound: async (name: string) => {
      await expect(page.getByText("Not Found", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name })).toHaveCount(
        0,
      );
    },
    expectWithdrawnNotice: () =>
      expect(
        page.getByText(
          "This sample is private. For more information, please contact the owner of the sample listing.",
        ),
      ).toBeVisible(),
    expectNoSection: (title: string) =>
      expect(page.getByRole("heading", { name: title })).toHaveCount(0),
    expectNoIndex: () =>
      expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex",
      ),
    expectNature: async (label: string) => {
      await expect(page.getByText("Nature")).toBeVisible();
      await expect(page.getByText(label)).toBeVisible();
    },
    expectRelation: async (title: string, identifier: string) => {
      const link = page.getByRole("link", { name: title });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", identifier);
      await expect(link).toHaveAttribute("target", "_blank");
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
    expectAttachment: (label: string) =>
      expect(page.getByText(label, { exact: true })).toBeVisible(),
    attachmentDownloadHref: (name: string) =>
      page.getByRole("link", { name: `Download ${name}` }).getAttribute("href"),
  };
}
