import { published, test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";
import { natureLabel } from "../support/nature-label";

test.describe("search facets", () => {
  test("a reader narrows results with a facet and can clear it", async ({
    page,
    samples,
  }) => {
    const { basalt, granite } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock_and_sediment.rock.igneous");
    await list.expectResultCount(2);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleLink("Granite 7", granite);

    await list.pickFacet("Nature", natureLabel("hand_sample"), "nature");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");

    await list.clearAllFilters();
    await list.expectLanding();
  });
});
