import { expect, type Page } from "@playwright/test";

import type { Visitor } from "./sample-contact.page";

import { homePage } from "./home.page";
import { sampleContactPage } from "./sample-contact.page";

export function contactPage(page: Page) {
  return {
    openFromFooter: async () => {
      await homePage(page).goto();
      await page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Contact" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Contact the administrators" }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
    },
    send: async (subject: string, visitor: Visitor) => {
      await page.getByRole("textbox", { name: "Subject" }).fill(subject);
      await sampleContactPage(page).send(visitor);
    },
    expectSent: async () => {
      await expect(
        page.getByText("Your message has been sent to the administrators."),
      ).toBeVisible();
      await page.waitForURL((url) => /^\/(\w{2}\/?)?$/.test(url.pathname));
    },
  };
}
