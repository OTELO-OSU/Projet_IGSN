import { expect, type Page } from "@playwright/test";

const TITLE = "IGSN-CNRS Terms of Use";

export function charterPage(page: Page) {
  const dialog = page.getByRole("dialog", { name: TITLE });
  const text = dialog.getByRole("region", { name: TITLE });
  const accept = dialog.getByRole("button", {
    name: "I have read and accept these Terms of Use",
  });

  const readToEnd = () => text.press("End");

  return {
    expectShown: () => expect(dialog).toBeVisible(),
    expectNotShown: () => expect(dialog).toBeHidden(),
    expectAcceptDisabled: () => expect(accept).toBeDisabled(),
    dismissWithEscape: () => page.keyboard.press("Escape"),
    readToEnd,
    accept: async () => {
      await readToEnd();
      await accept.click();
    },
  };
}
