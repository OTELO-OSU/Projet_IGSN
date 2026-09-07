import { expect, type Locator, type Page } from "@playwright/test";

export const pickHierarchyLevel = (
  page: Page,
  combobox: Locator,
  label: string,
) => {
  const chip = page.getByRole("button", {
    name: `Remove ${label}`,
    exact: true,
  });
  return expect(async () => {
    if (!(await chip.isVisible())) {
      await combobox.click();
      await page.getByRole("option", { name: label, exact: true }).click();
    }
    await expect(chip).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
};
