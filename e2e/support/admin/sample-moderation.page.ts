import { expect, type Page } from "@playwright/test";

import { sampleRow } from "./sample-list.page";

export function sampleModerationPage(page: Page) {
  const menuEntry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Sample moderation" });

  return {
    open: () => menuEntry.click(),
    expectVisible: () =>
      expect(
        page.getByRole("heading", { name: "Sample moderation", level: 1 }),
      ).toBeVisible(),
    expectSampleRowWithOwnerStatus: (name: string, status: string) =>
      expect(
        sampleRow(page, name).getByRole("cell", { name: status }),
      ).toBeVisible(),
    openSample: (name: string) => page.getByRole("link", { name }).click(),
  };
}
