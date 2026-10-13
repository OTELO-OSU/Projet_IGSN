import { expect, type Page } from "@playwright/test";

export const chooseUser =
  (page: Page) => async (field: RegExp, search: string, name: string) => {
    await page.getByRole("combobox", { name: field }).click();
    await page.getByPlaceholder("Search by name or email").fill(search);
    await page.getByRole("option").filter({ hasText: name }).click();
  };

export function serviceAccountPage(page: Page) {
  return {
    expectVisible: (name: string) =>
      expect(page.getByRole("heading", { name, level: 1 })).toBeVisible(),
    expectPrefilled: async (prefill: {
      name: string;
      owner: string;
      samplesOwner: string;
    }) => {
      await expect(
        page.getByRole("textbox", { name: "Service name" }),
      ).toHaveValue(prefill.name);
      const requestedBy = page.getByRole("combobox", { name: /^Requested by/ });
      await expect(requestedBy).toContainText(prefill.owner);
      await expect(requestedBy).toBeDisabled();
      await expect(
        page.getByRole("combobox", { name: /^Samples owner/ }),
      ).toContainText(prefill.samplesOwner);
    },
    create: () =>
      page.getByRole("button", { name: "Create", exact: true }).click(),
  };
}
