import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleListPage(page: Page) {
  return {
    goto: () => page.goto(`${frontendUrl}/search`),
    // Open the results page pre-filtered, exercising the "restore facets from
    // the URL" path (a shared/bookmarked search).
    gotoWithSearch: async (query: string) => {
      await page.goto(`${frontendUrl}/search?${query}`);
      await page.waitForLoadState("networkidle");
    },
    // The "{count} results" line above the list.
    expectResultCount: (count: number) =>
      expect(page.getByText(`${count} results`)).toBeVisible(),
    expectSampleAbsent: (name: string) =>
      expect(page.getByRole("link", { name })).toHaveCount(0),
    // Pick a value in an enum facet (e.g. Nature): open its combobox, choose the
    // option, and wait for the URL param to appear.
    pickFacet: async (facet: string, option: string, param: string) => {
      await page.getByRole("combobox", { name: facet }).click();
      await page.getByRole("option", { name: option }).click();
      await page.waitForURL(new RegExp(`[?&]${param}=`));
    },
    // Choose an option in one level of a hierarchy facet's cascade (the combobox
    // is labelled by the level, e.g. "Igneous"). No URL wait: the param may
    // already be present from a shallower value, so the caller asserts on the
    // narrowed results instead.
    chooseFacetOption: async (level: string, option: string) => {
      await page.getByRole("combobox", { name: level }).click();
      await page.getByRole("option", { name: option }).click();
    },
    // Type into a text facet (e.g. Collector), commit, and wait for its param.
    fillTextFacet: async (facet: string, value: string, param: string) => {
      const field = page.getByRole("searchbox", { name: facet });
      await field.fill(value);
      await field.press("Enter");
      await page.waitForURL(new RegExp(`[?&]${param}=`));
    },
    // Set the lower bound of the age range facet; it commits on blur.
    fillAgeMin: async (value: string) => {
      const field = page.getByRole("spinbutton", { name: "Min" });
      await field.fill(value);
      await field.blur();
      await page.waitForURL(/[?&]ageMin=/);
    },
    clearAllFilters: () =>
      page.getByRole("button", { name: /clear all filters/i }).click(),
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
