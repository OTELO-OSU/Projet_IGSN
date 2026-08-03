import { expect, type Page } from "@playwright/test";

import { frontendUrl } from "../urls";

export function sampleListPage(page: Page) {
  return {
    // A query is composed on the landing page: /search only holds results.
    goto: () => page.goto(frontendUrl),
    gotoEmptySearch: () => page.goto(`${frontendUrl}/search`),
    gotoWithSearch: async (query: string) => {
      await page.goto(`${frontendUrl}/search?${query}`);
      await page.waitForLoadState("networkidle");
    },
    expectResultCount: (count: number) =>
      expect(
        page.getByText(count === 1 ? "1 result" : `${count} results`, {
          exact: true,
        }),
      ).toBeVisible(),
    expectPageSize: (size: number) =>
      expect(
        page.getByRole("combobox", { name: "Results per page" }),
      ).toHaveText(String(size)),
    expectNoResults: () =>
      expect(page.getByText("No samples match your search.")).toBeVisible(),
    expectSampleAbsent: (name: string) =>
      expect(page.getByRole("link", { name })).toHaveCount(0),
    pickFacet: async (facet: string, option: string, param: string) => {
      await page.getByRole("combobox", { name: facet }).click();
      await page.getByRole("option", { name: option }).click();
      await page.waitForURL(new RegExp(`[?&]${param}=`));
    },
    // No URL wait: the param may already be present from a shallower value, so
    // the caller asserts on the narrowed results instead.
    chooseFacetOption: async (level: string, option: string) => {
      await page.getByRole("combobox", { name: level }).click();
      await page.getByRole("option", { name: option }).click();
    },
    fillTextFacet: async (facet: string, value: string, param: string) => {
      const field = page.getByRole("searchbox", { name: facet });
      await field.fill(value);
      await field.press("Enter");
      await page.waitForURL(new RegExp(`[?&]${param}=`));
    },
    fillAgeMin: async (value: string) => {
      const field = page.getByRole("spinbutton", { name: "Min" });
      await field.fill(value);
      await field.blur();
      await page.waitForURL(/[?&]ageMin=/);
    },
    clearAllFilters: () =>
      page.getByRole("button", { name: /clear all filters/i }).click(),
    search: async (query: string) => {
      await page.waitForLoadState("networkidle");
      // networkidle does not mean hydrated: a `fill` before React attaches its
      // listeners never reaches component state, so the submit finds nothing.
      await expect(async () => {
        const searchbox = page.getByRole("searchbox", {
          name: "Search samples",
        });
        await searchbox.clear();
        await searchbox.pressSequentially(query);
        await searchbox.press("Enter");
        await page.waitForURL(/[?&]q=/, { timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
    },
    expectFacetsVisible: () =>
      expect(
        page.getByRole("complementary", { name: "Filters" }),
      ).toBeVisible(),
    expectLanding: () =>
      expect(
        page.getByRole("heading", { name: "Search a sample" }),
      ).toBeVisible(),
    expectSampleLink: (name: string, igsn: string) =>
      expect(page.getByRole("link", { name })).toHaveAttribute(
        "href",
        `/en/samples/${igsn}`,
      ),
  };
}
