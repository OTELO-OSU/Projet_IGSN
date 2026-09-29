import { sampleNamed, test } from "../support/db";
import { resultsMapPage } from "../support/frontend/results-map.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage } from "../support/frontend/sample-list.page";

const ASH = "material=rock_and_sediment.sediment";
const ALL_ASH = 4;
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

    await map.expectResultCount(ALL_ASH);
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

  test("a reader finds a sample without a location in the list only", async ({
    page,
  }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen("q=nowhere");

    await map.expectListed("Nowhere Ash");
    await map.expectMarkedSampleCount(0);
  });

  test("a reader lists the area they move the map to", async ({ page }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen(ASH);

    await map.panRight();

    await map.expectResultCount(EUROPEAN_ASH);
    await map.expectLocationSearchUntouched();
  });

  test("a reader moves the map without searching once they untick it", async ({
    page,
  }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen(ASH);

    await map.stopSearchingWhileMoving();
    await map.panRight();

    await map.expectResultCount(ALL_ASH);
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

  test("a reader opens a sample from its marker", async ({ page, samples }) => {
    const map = resultsMapPage(page);
    await map.gotoOpen(ASH);

    await map.openSample("Fuji Ash");

    await sampleDetailPage(page).expectSample(
      "Fuji Ash",
      sampleNamed(samples, "Fuji Ash").igsn,
    );
  });
});
