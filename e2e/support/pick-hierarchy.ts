import { expect, type Locator, type Page } from "@playwright/test";

export const pickHierarchyLevel = (
  page: Page,
  combobox: Locator,
  label: string,
  scope: Locator | Page = page,
) => {
  const chip = scope.getByRole("button", {
    name: `Remove ${label}`,
    exact: true,
  });
  const option = page.getByRole("option", { name: label, exact: true });
  return expect(async () => {
    if (!(await chip.isVisible())) {
      if (!(await option.isVisible())) await combobox.click();
      await option.click();
    }
    await expect(chip).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
};
