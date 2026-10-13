import { sampleNamed, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("sample detail", () => {
  test("a reader opens a sample by its igsn", async ({ page, samples }) => {
    const sample = sampleNamed(samples, "Basalt 42");

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);

    await detail.expectSample(sample.name, sample.igsn);
    await detail.expectNature("Hand sample");
    await detail.expectNoLineage();
    await detail.expectLocationOnMap("Latitude: 45.77, Longitude: 2.96");
  });
});
