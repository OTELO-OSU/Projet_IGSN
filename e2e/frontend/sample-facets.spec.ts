import { sampleNamed, test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";
import { natureLabel } from "../support/nature-label";

test.describe("search facets", () => {
  test("a reader narrows results with a facet and can clear it", async ({
    page,
    samples,
  }) => {
    const basalt = sampleNamed(samples, "Basalt 42");
    const granite = sampleNamed(samples, "Granite 7");
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock_and_sediment.rock.igneous");
    await list.expectResultCount(2);
    await list.expectSampleLink(basalt.name, basalt.igsn);
    await list.expectSampleLink(granite.name, granite.igsn);

    await list.pickFacet("Nature", natureLabel("hand_sample"), "nature");
    await list.expectResultCount(1);
    await list.expectSampleLink(basalt.name, basalt.igsn);
    await list.expectSampleAbsent(granite.name);

    await list.clearAllFilters();
    await list.expectLanding();
  });
});
