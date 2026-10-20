import { sampleNamed, test } from "../support/db";
import { homePage } from "../support/frontend/home.page";
import { resultsMapPage } from "../support/frontend/results-map.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { sampleListPage } from "../support/frontend/sample-list.page";

const LOCATED_ASH = 3;

test.describe("search results map", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

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
    await map.expectMarker(fuji.name);
    await map.expectMarkedSampleCount(LOCATED_ASH);

    await map.expectMarkerTooltip(fuji.name, fuji.igsn);
    await map.selectMarker(fuji.name);
    await map.expectSelected(fuji.name);
    const samplePage = await map.openListedInNewTab(fuji.name);

    await sampleDetailPage(samplePage).expectSample(fuji.name, fuji.igsn);
  });

  test("a reader maps every published sample from the home page", async ({
    page,
    samples,
  }) => {
    const fuji = sampleNamed(samples, "Fuji Ash");
    const baikal = sampleNamed(samples, "Baikal Marble");
    const home = homePage(page);
    const map = resultsMapPage(page);
    await home.goto();

    await home.mapAllSamples();

    await map.expectMarker(baikal.name);
    await map.expectMarker(fuji.name);
    await map.expectEveryMarkedSampleCounted();
  });
});
