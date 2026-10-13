import { sampleNamed, test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader can search for a sample by name and add a field to the result cards", async ({
    page,
    samples,
  }) => {
    const target = sampleNamed(samples, "Basalt 42");

    const list = sampleListPage(page);
    await list.goto();
    await list.search(target.name);

    await list.expectSampleLink(target.name, target.igsn);

    await list.pickCardField("Collection method");
    await list.expectCardLine("Collection method", "Blasting");

    await page.reload();

    await list.expectCardLine("Collection method", "Blasting");
  });
});
