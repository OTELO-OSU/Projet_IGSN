import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader opening the results page without a query is sent home", async ({
    page,
  }) => {
    const list = sampleListPage(page);
    await list.gotoEmptySearch();

    await list.expectLanding();
  });

  test("a reader can search for a sample by name", async ({
    page,
    samples,
  }) => {
    const target = samples.find((s) => s.published && s.igsn !== null);
    if (!target?.igsn) {
      throw new Error("seed must include a published sample");
    }

    const list = sampleListPage(page);
    await list.goto();
    await list.search(target.name);

    await list.expectSampleLink(target.name, target.igsn);
  });

  test("a reader can search words that are not next to each other", async ({
    page,
    samples,
  }) => {
    const target = samples.find((sample) => sample.name === "Basalt 42");
    if (!target?.igsn) {
      throw new Error("seed must include the published Basalt 42 sample");
    }

    const list = sampleListPage(page);
    await list.goto();
    await list.search("42 basalt");

    await list.expectSampleLink(target.name, target.igsn);
  });

  test("a shared URL restores the chosen page size", async ({ page }) => {
    const list = sampleListPage(page);
    await list.gotoWithSearch("q=basalt&perPage=10");

    await list.expectPageSize(10);
  });

  test("a reader is told when nothing matches the query", async ({ page }) => {
    const list = sampleListPage(page);
    await list.goto();
    await list.search("zzzznotasample");

    await list.expectNoResults();
  });

  test("a reader can search with a wildcard", async ({ page, samples }) => {
    const target = samples.find((sample) => sample.name === "Basalt 42");
    if (!target?.igsn) {
      throw new Error("seed must include the published Basalt 42 sample");
    }

    const list = sampleListPage(page);
    await list.goto();
    await list.search("bas*");

    await list.expectSampleLink(target.name, target.igsn);
    // "Granite 7" is the other published sample; it has no word starting "bas".
    await list.expectSampleAbsent("Granite 7");
  });
});
