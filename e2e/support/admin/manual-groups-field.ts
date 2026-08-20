import { expect, type Page } from "@playwright/test";

export const waitForMyManualGroups = (page: Page) =>
  page.waitForResponse((response) =>
    response.url().includes("currentUser/manual-groups"),
  );

export const expectNoManualGroupOffered = (page: Page) =>
  expect(
    page.getByRole("heading", { name: "Manual groups", level: 2 }),
  ).toBeHidden();

export async function attachManualGroup(
  page: Page,
  field: string,
  name: string,
) {
  const chip = page.getByRole("button", { name: `Detach ${name}` });
  await expect(async () => {
    if (!(await chip.isVisible())) {
      await page.keyboard.press("Escape");
      await page.getByRole("combobox", { name: field }).click();
      await page.getByPlaceholder("Search by name").fill(name);
      await page
        .getByRole("option", { name, exact: true })
        .click({ timeout: 5_000 });
    }
    await expect(chip).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  await page.keyboard.press("Escape");
}
