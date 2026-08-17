import type { Locator, Page } from "@playwright/test";

export function chooseOption(page: Page, scope: Locator | Page = page) {
  return async (field: string, option: string) => {
    await scope.getByRole("combobox", { name: field }).click();
    await page.getByRole("option", { name: option }).click();
  };
}
