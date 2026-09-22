import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls.ts";

export function tombstonePage(page: Page) {
  return {
    goto: async () => {
      const response = await page.goto(`${frontendUrl}/tombstone`);
      expect(response?.status()).toBe(200);
    },
    expectRemovedNotice: async () => {
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "This sample has been removed",
        }),
      ).toBeVisible();
    },
  };
}
