import { expect, type Locator, type Page } from "@playwright/test";

export function chooseOption(page: Page, scope: Locator | Page = page) {
  return async (field: string | RegExp, option: string) => {
    await scope.getByRole("combobox", { name: field }).click();
    await page.getByRole("option", { name: option }).click();
    await expect(page.getByRole("option")).toHaveCount(0);
  };
}
