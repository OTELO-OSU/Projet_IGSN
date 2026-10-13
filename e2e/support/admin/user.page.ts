import { expect, type Page } from "@playwright/test";

import { chooseOption } from "./choose-option.ts";

export function userPage(page: Page) {
  const statusField = page.getByRole("combobox", {
    name: "Status",
    exact: true,
  });

  const save = async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Account updated")).toBeVisible();
  };

  return {
    setStatus: async (status: string) => {
      await chooseOption(page)("Status", status);
      await save();
    },
    expectStatus: (status: string) => expect(statusField).toContainText(status),
  };
}
