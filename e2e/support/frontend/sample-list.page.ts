import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

import { HEADER_ROW, openSamplesSheet } from "../admin/template-workbook.ts";
import { withOptionalCount } from "../pick-hierarchy.ts";
import { frontendUrl } from "../urls";

export function sampleListPage(page: Page) {
  const openFilters = page.getByRole("button", { name: /^Filters/ });
  const sidebar = page.getByRole("complementary", { name: "Filters" });
  const dialog = page.getByRole("dialog", {
    name: "Filters",
    includeHidden: true,
  });
  const expandFilters = async (filters: Locator) => {
    const collapsed = filters
      .getByRole("heading", { level: 2 })
      .getByRole("button", { expanded: false });
    while ((await collapsed.count()) > 0) await collapsed.first().click();
  };
  const inFilters = async (act: (filters: Locator) => Promise<void>) => {
    const isPanel = await openFilters.isVisible();
    if (isPanel) await openFilters.click();
    const filters = isPanel ? dialog : sidebar;
    await expandFilters(filters);
    await act(filters);
    if (await dialog.isVisible()) {
      await dialog.getByRole("button", { name: "Show results" }).click();
    }
  };

  return {
    goto: () => page.goto(frontendUrl),
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
    expectNoResults: () =>
      expect(page.getByText("No samples match your search.")).toBeVisible(),
    expectSampleAbsent: (name: string) =>
      expect(page.getByRole("link", { name })).toHaveCount(0),
    pickFacet: (facet: string, option: string, param: string) =>
      inFilters(async (filters) => {
        await filters.getByRole("combobox", { name: facet }).click();
        await page.getByRole("option", { name: option }).click();
        await page.waitForURL(new RegExp(`[?&]${param}=`));
      }),
    includeSubSamples: () =>
      inFilters(async (filters) => {
        await filters
          .getByRole("switch", { name: "Include sub-samples" })
          .click();
        await page.waitForURL(/[?&]includeSubSamples=true/);
      }),
    expectFacetValue: (facet: string, value: string) =>
      inFilters(async (filters) => {
        await expect(filters.getByRole("combobox", { name: facet })).toHaveText(
          withOptionalCount(value),
        );
      }),
    clearAllFilters: () =>
      inFilters(async (filters) => {
        const clearAll = filters.getByRole("button", {
          name: /clear all filters/i,
        });
        await clearAll.click();
        await expect(clearAll).toHaveCount(0);
      }),
    pickCardField: async (field: string) => {
      await page.getByRole("button", { name: "Add field results" }).click();
      await page.getByRole("checkbox", { name: field }).click();
      await page.keyboard.press("Escape");
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
    switchToTableView: async () => {
      await page.getByRole("radio", { name: "Table view" }).click();
      await expect(page.getByRole("table")).toBeVisible();
    },
    expectTableView: () =>
      expect(
        page.getByRole("radio", { name: "Table view", checked: true }),
      ).toBeVisible(),
    checkSample: (name: string) =>
      page.getByRole("checkbox", { name: `Select ${name}` }).check(),
    pickPageSize: async (size: string) => {
      await page.getByRole("combobox", { name: "Results per page" }).click();
      await page.getByRole("option", { name: size }).click();
      await page.waitForURL(new RegExp(`[?&]perPage=${size}`));
    },
    downloadCheckedIgsns: async (format: string, testInfo: TestInfo) => {
      await page
        .getByRole("button", { name: /^Download \d+ selected$/ })
        .click();
      const download = page.waitForEvent("download");
      await page.getByRole("menuitem", { name: format }).click();
      const file = await download;
      const path = testInfo.outputPath(file.suggestedFilename());
      await file.saveAs(path);
      const { sheet, columnOf } = await openSamplesSheet(path);
      return sheet
        .getColumn(columnOf("IGSN"))
        .values.slice(HEADER_ROW + 1)
        .filter(Boolean);
    },
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
