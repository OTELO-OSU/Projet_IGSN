import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader is invited to search when no query is entered", async ({
    page,
  }) => {
    const list = sampleListPage(page);
    await list.goto();

    // Empty query performs no search: the reader is prompted to type one.
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
});
