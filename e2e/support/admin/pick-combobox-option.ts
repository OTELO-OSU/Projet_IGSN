import { expect, type Page } from "@playwright/test";

export async function pickComboboxOption(
  page: Page,
  {
    field,
    option,
    query = option,
    chipLabel,
  }: { field: string; option: string; query?: string; chipLabel: string },
) {
  const chip = page.getByRole("button", { name: chipLabel });
  await expect(async () => {
    if (!(await chip.isVisible())) {
      const search = page.getByPlaceholder("Search by name");
      if (await search.isVisible()) await page.keyboard.press("Escape");
      await page.getByRole("combobox", { name: field, exact: true }).click();
      await search.fill(query);
      await page
        .getByRole("option", { name: option, exact: true })
        .click({ timeout: 5_000 });
    }
    await expect(chip).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  await page.keyboard.press("Escape");
}
