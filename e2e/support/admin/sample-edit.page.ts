import { expect, type Page } from "@playwright/test";

export function sampleEditPage(page: Page) {
  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "Edit sample" })).toBeVisible(),
    expectName: (name: string) =>
      expect(page.getByLabel(/name/i)).toHaveValue(name),
    goToList: () => page.getByRole("link", { name: "IGSN Admin" }).click(),
  };
}
