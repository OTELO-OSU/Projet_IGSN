import { test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("sample detail", () => {
  test("a reader opens a sample by its igsn", async ({ page, samples }) => {
    const sample = samples.find((s) => s.status === "published");
    if (!sample || sample.igsn === null) {
      throw new Error("seed must include a published sample with an igsn");
    }

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);

    await detail.expectSample(sample.name, sample.igsn);
    await detail.expectNature("Hand sample");
  });
});
