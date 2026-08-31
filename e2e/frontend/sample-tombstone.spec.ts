import { published, test, tombstone } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("a tombstoned sample", () => {
  test("is absent from the search results", async ({ page, samples }) => {
    const sample = tombstone(samples);
    const { basalt } = published(samples);

    const list = sampleListPage(page);
    await list.gotoWithSearch(`q=${encodeURIComponent(sample.name)}`);
    await list.expectNoResults();

    await list.gotoWithSearch("q=Basalt+42");
    await list.expectSampleLink("Basalt 42", basalt);
  });

  test("has no public page", async ({ page, samples }) => {
    const sample = tombstone(samples);

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);

    await detail.expectNotFound(sample.name);
  });
});
