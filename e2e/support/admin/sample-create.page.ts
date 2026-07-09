import { expect, type Page } from "@playwright/test";

export function sampleCreatePage(page: Page) {
  return {
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Create sample" }),
      ).toBeVisible(),
    fillName: (name: string) => page.getByLabel(/name/i).fill(name),
    selectNature: async (label: string) => {
      await page.getByRole("combobox", { name: /nature/i }).click();
      await page.getByRole("option", { name: label }).click();
    },
    selectType: async (label: string) => {
      await page.getByRole("tab", { name: "Sample type" }).click();
      await page.getByRole("combobox", { name: "Type *", exact: true }).click();
      await page.getByRole("option", { name: label }).click();
    },
    submit: () => page.getByRole("button", { name: "Create" }).click(),
    expectNameRequired: () =>
      expect(page.getByText("Name is required")).toBeVisible(),
  };
}
