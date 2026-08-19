import { expect, type Page } from "@playwright/test";

import { attachManualGroup } from "./manual-groups-field.ts";

export function userPage(page: Page) {
  return {
    expectVisible: (email: string) =>
      expect(page.getByText(email)).toBeVisible(),
    associateGroup: async (name: string) => {
      await attachManualGroup(page, "Manual groups", name);
      await page.getByRole("button", { name: "Save" }).click();
    },
    expectGroup: (name: string) =>
      expect(
        page.getByRole("button", { name: `Detach ${name}` }),
      ).toBeVisible(),
  };
}
