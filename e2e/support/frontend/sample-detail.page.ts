import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleDetailPage(page: Page) {
  return {
    goto: (igsn: string) => page.goto(`${frontendUrl}/samples/${igsn}`),
    expectSample: async (name: string, igsn: string) => {
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText(igsn)).toBeVisible();
    },
    expectNature: async (label: string) => {
      await expect(page.getByText("Nature")).toBeVisible();
      await expect(page.getByText(label)).toBeVisible();
    },
  };
}
