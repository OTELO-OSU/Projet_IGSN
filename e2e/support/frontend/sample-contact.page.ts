import { expect, type Page } from "@playwright/test";

export type Visitor = {
  name: string;
  firstname: string;
  email: string;
  message: string;
};

export function sampleContactPage(page: Page) {
  return {
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Contact the record owner" }),
      ).toBeVisible(),
    send: async (visitor: Visitor) => {
      await page
        .getByRole("textbox", { name: "Name", exact: true })
        .fill(visitor.name);
      await page
        .getByRole("textbox", { name: "First name" })
        .fill(visitor.firstname);
      await page
        .getByRole("textbox", { name: "Email address" })
        .fill(visitor.email);
      await page
        .getByRole("textbox", { name: "Message" })
        .fill(visitor.message);
      await page.getByRole("button", { name: "Send" }).click();
    },
  };
}
