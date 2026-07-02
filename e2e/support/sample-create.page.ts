import { expect, type Page } from "@playwright/test";

export function sampleCreatePage(page: Page) {
  return {
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Create sample" }),
      ).toBeVisible(),
    fillName: (name: string) => page.getByLabel(/name/i).fill(name),
    selectNature: async (label: string) => {
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: label }).click();
    },
    publish: () => page.getByRole("button", { name: "Publish" }).click(),
    expectNameRequired: () =>
      expect(page.getByText("Name is required")).toBeVisible(),
  };
}
