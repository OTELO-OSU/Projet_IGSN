import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleDetailPage(page: Page) {
  return {
    goto: (id: string) => page.goto(`${frontendUrl}/samples/${id}`),
    expectSample: async (name: string, id: string) => {
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText(id)).toBeVisible();
    },
    expectNature: async (label: string) => {
      await expect(page.getByText("Nature")).toBeVisible();
      await expect(page.getByText(label)).toBeVisible();
    },
  };
}
