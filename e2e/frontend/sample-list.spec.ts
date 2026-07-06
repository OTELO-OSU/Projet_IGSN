import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader sees every published sample", async ({ page, samples }) => {
    const list = sampleListPage(page);
    await list.goto();

    // The public list carries only published samples, each linked by its IGSN.
    for (const sample of samples) {
      if (!sample.published || sample.igsn === null) {
        continue;
      }
      await list.expectSampleLink(sample.name, sample.igsn);
    }
  });
});
