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
    // A DOI link opens in a new tab, its description alongside.
    expectDoiLink: async (url: string, description: string) => {
      const link = page.getByRole("link", { name: url });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", url);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(page.getByText(description)).toBeVisible();
    },
    expectAttachment: (name: string) =>
      expect(page.getByText(name, { exact: true })).toBeVisible(),
    attachmentDownloadHref: (name: string) =>
      page.getByRole("link", { name: `Download ${name}` }).getAttribute("href"),
  };
}
