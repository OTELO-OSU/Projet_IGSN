import { expect, type Locator, type Page } from "@playwright/test";

// Retried because the first click after hydration is sometimes swallowed; the
// chip is the proof the level registered (the popover stays open on a non-leaf).
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
