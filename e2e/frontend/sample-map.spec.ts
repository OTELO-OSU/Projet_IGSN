import { sampleNamed, test } from "../support/db";
import { resultsMapPage } from "../support/frontend/results-map.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage } from "../support/frontend/sample-list.page";

const ASH = "material=rock_and_sediment.sediment";
const LOCATED_ASH = 3;
const EUROPEAN_ASH = 2;

test.describe("search results map", () => {
  test("a reader maps every located result across the world", async ({
    page,
  }) => {
    const list = sampleListPage(page);
    const map = resultsMapPage(page);
    await list.gotoWithSearch(ASH);

    await map.open();

    await map.expectResultCount(LOCATED_ASH);
    await map.expectMarker("Fuji Ash");
    await map.expectMarkedSampleCount(LOCATED_ASH);
  });

  test("a reader narrows the map and the list with a facet", async ({
    page,
  }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen(`${ASH}&nature=powder`);

    await map.expectResultCount(2);
    await map.expectMarkedSampleCount(2);
  });

  test("a reader finds a sample without a location neither marked nor listed", async ({
    page,
  }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen("q=nowhere");

    await map.expectNothingListed();
    await map.expectMarkedSampleCount(0);
  });

  test("a reader lists the area they move the map to", async ({ page }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen(ASH);

    await map.panRight();

    await map.expectResultCount(EUROPEAN_ASH);
    await map.expectLocationSearchUntouched();
  });

  test("a reader zooms into a cluster to split it", async ({ page }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen(ASH);
    await map.expectMarkedSampleCount(LOCATED_ASH);

    await map.clickFirstCluster();

    await map.expectMarker("Vesuvius Ash");
    await map.expectMarker("Etna Ash");
  });

  test("a reader selects a sample from its marker and opens it in a new tab", async ({
    page,
    samples,
  }) => {
    const map = resultsMapPage(page);
    const fuji = sampleNamed(samples, "Fuji Ash");
    await map.gotoOpen(ASH);

    await map.expectMarkerTooltip("Fuji Ash", fuji.igsn);
    await map.selectMarker("Fuji Ash");
    await map.expectSelected("Fuji Ash");
    const samplePage = await map.openListedInNewTab("Fuji Ash");

    await sampleDetailPage(samplePage).expectSample("Fuji Ash", fuji.igsn);
  });
});
