import { sampleNamed, test } from "../support/db";
import { resultsMapPage } from "../support/frontend/results-map.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage } from "../support/frontend/sample-list.page";

const LOCATED_ASH = 3;

test.describe("search results map", () => {
  test("a reader maps every located result across the world, then opens one from its marker in a new tab", async ({
    page,
    samples,
  }) => {
    const list = sampleListPage(page);
    const map = resultsMapPage(page);
    const fuji = sampleNamed(samples, "Fuji Ash");
    await list.gotoWithSearch("material=rock_and_sediment.sediment");

    await map.open();

    await map.expectResultCount(LOCATED_ASH);
    await map.expectMarker("Fuji Ash");
    await map.expectMarkedSampleCount(LOCATED_ASH);

    await map.expectMarkerTooltip("Fuji Ash", fuji.igsn);
    await map.selectMarker("Fuji Ash");
    await map.expectSelected("Fuji Ash");
    const samplePage = await map.openListedInNewTab("Fuji Ash");

    await sampleDetailPage(samplePage).expectSample("Fuji Ash", fuji.igsn);
  });
});
