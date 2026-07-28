import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader is invited to search when no query is entered", async ({
    page,
  }) => {
    const list = sampleListPage(page);
    await list.goto();

    await list.expectSearchInvite();
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
    // Not contiguous in that order, so a single-substring search would miss it.
    const target = samples.find((sample) => sample.name === "Basalt 42");
    if (!target?.igsn) {
      throw new Error("seed must include the published Basalt 42 sample");
    }

    const list = sampleListPage(page);
    await list.goto();
    await list.search("42 basalt");

    await list.expectSampleLink(target.name, target.igsn);
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
