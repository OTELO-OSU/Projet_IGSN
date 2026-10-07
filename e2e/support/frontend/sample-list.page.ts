import { expect, type Page } from "@playwright/test";

import { pickHierarchyLevel, withOptionalCount } from "../pick-hierarchy.ts";
import { frontendUrl } from "../urls";

export function sampleListPage(page: Page) {
  const filters = page.getByRole("complementary", { name: "Filters" });
  const expandFilters = async () => {
    const collapsed = filters
      .getByRole("heading", { level: 2 })
      .getByRole("button", { expanded: false });
    while ((await collapsed.count()) > 0) await collapsed.first().click();
  };

  return {
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
      await expandFilters();
      await page.getByRole("combobox", { name: facet }).click();
      await page.getByRole("option", { name: option }).click();
      await page.waitForURL(new RegExp(`[?&]${param}=`));
    },
    includeSubSamples: async () => {
      await expandFilters();
      await page.getByRole("switch", { name: "Include sub-samples" }).click();
      await page.waitForURL(/[?&]includeSubSamples=true/);
    },
    expectFacetValue: async (facet: string, value: string) => {
      await expandFilters();
      await expect(page.getByRole("combobox", { name: facet })).toHaveText(
        withOptionalCount(value),
      );
    },
    expectFacetSection: (section: string, expanded: boolean) =>
      expect(
        filters.getByRole("button", { name: section, exact: true, expanded }),
      ).toBeVisible(),
    expectActiveFilter: (chip: string) =>
      expect(
        filters
          .getByRole("list", { name: "Active filters" })
          .getByRole("listitem")
          .filter({ hasText: chip }),
      ).toBeVisible(),
    expectFacetOptionAbsent: async (facet: string, option: string) => {
      await expandFilters();
      await page.getByRole("combobox", { name: facet }).click();
      await expect(page.getByRole("option", { name: option })).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
    drillFacet: async (facet: string, option: string) => {
      await expandFilters();
      await pickHierarchyLevel(
        page,
        page.getByRole("combobox", { name: facet }),
        option,
      );
    },
    fillTextFacet: async (facet: string, value: string, param: string) => {
      await expandFilters();
      const field = page.getByRole("searchbox", { name: facet });
      await field.fill(value);
      await field.press("Enter");
      await page.waitForURL(new RegExp(`[?&]${param}=`));
    },
    fillAgeMin: async (value: string) => {
      await expandFilters();
      const field = page.getByRole("spinbutton", { name: "Min" });
      await field.fill(value);
      await field.blur();
      await page.waitForURL(/[?&]ageMin=/);
    },
    clearAllFilters: () =>
      page.getByRole("button", { name: /clear all filters/i }).click(),
    pickCardField: async (field: string) => {
      await page.getByRole("button", { name: "Add field results" }).click();
      await page.getByRole("checkbox", { name: field }).click();
      await page.keyboard.press("Escape");
    },
    expectCardIds: async (
      name: string,
      igsn: string,
      hasInternalId: boolean,
    ) => {
      const card = page.getByRole("link", { name });
      await expect(card.getByText(igsn)).toBeVisible();
      await expect(card.getByText(/^sample-\d+$/)).toHaveCount(
        hasInternalId ? 1 : 0,
      );
    },
    expectCardLine: (field: string, value: string) =>
      expect(
        page
          .getByRole("paragraph")
          .filter({ has: page.getByRole("img", { name: field, exact: true }) })
          .filter({ hasText: value })
          .first(),
      ).toBeVisible(),
    search: async (query: string) => {
      await page.waitForLoadState("networkidle");
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
    expectFacetsVisible: () => expect(filters).toBeVisible(),
    expectLanding: () =>
      expect(
        page.getByRole("heading", { name: "Search for a sample" }),
      ).toBeVisible(),
    expectSampleLink: (name: string, igsn: string) =>
      expect(page.getByRole("link", { name })).toHaveAttribute(
        "href",
        `/en/samples/${igsn}`,
      ),
  };
}
