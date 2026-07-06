import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader sees every published sample", async ({ page, samples }) => {
    const list = sampleListPage(page);
    await list.goto();

    for (const sample of samples) {
      await list.expectSampleLink(sample.name, sample.id);
    }
  });
});
