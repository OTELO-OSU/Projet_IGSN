import { test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("sample detail", () => {
  test("a reader opens a sample by its id", async ({ page, samples }) => {
    const sample = samples[0];

    const detail = sampleDetailPage(page);
    await detail.goto(sample.id);

    await detail.expectSample(sample.name, sample.id);
    await detail.expectNature("Rock powder");
  });
});
