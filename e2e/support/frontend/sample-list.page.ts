import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleListPage(page: Page) {
  return {
    goto: () => page.goto(`${frontendUrl}/search`),
    search: async (query: string) => {
      // Wait for the client bundle to hydrate before typing, else the submit
      // fires before React attaches its onSubmit handler.
      await page.waitForLoadState("networkidle");
      await page.getByRole("searchbox").fill(query);
      // Search only runs on submit, not while typing.
      await page.getByRole("searchbox").press("Enter");
      await page.waitForURL(/[?&]q=/);
    },
    // With no query the page invites a search instead of listing samples.
    expectSearchInvite: () =>
      expect(page.getByText(/type a query/i)).toBeVisible(),
    // Each sample is a link to its detail page, addressed by IGSN; assert both
    // the name and that it points at the right sample so a wrong href can't pass
    // unnoticed.
    expectSampleLink: (name: string, igsn: string) =>
      expect(page.getByRole("link", { name })).toHaveAttribute(
        "href",
        `/en/samples/${igsn}`,
      ),
  };
}
