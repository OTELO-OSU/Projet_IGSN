import { published, test, withdrawn } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("a withdrawn sample", () => {
  test("is absent from the search results", async ({ page, samples }) => {
    const sample = withdrawn(samples);
    const { basalt } = published(samples);

    const list = sampleListPage(page);
    await list.gotoWithSearch(`q=${encodeURIComponent(sample.name)}`);
    await list.expectNoResults();

    await list.gotoWithSearch("q=Basalt+42");
    await list.expectSampleLink("Basalt 42", basalt);
  });

  test("keeps a reduced public page, hidden from search engines", async ({
    page,
    samples,
  }) => {
    const sample = withdrawn(samples);

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);

    await detail.expectSample(sample.name, sample.igsn);
    await detail.expectWithdrawnNotice();
    await detail.expectNoSection("Location");
    await detail.expectNoIndex();
    await detail.openContactForm();
  });
});
