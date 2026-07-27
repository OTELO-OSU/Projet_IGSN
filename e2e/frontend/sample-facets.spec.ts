import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";
import { natureLabel } from "../support/nature-label";

// The two published seed samples, looked up by name so the IGSN comes from the
// seed (derived from the id) rather than a hard-coded copy.
function published(samples: { name: string; igsn: string | null }[]) {
  const igsnOf = (name: string) => {
    const igsn = samples.find((s) => s.name === name)?.igsn;
    if (!igsn) throw new Error(`seed must publish "${name}"`);
    return igsn;
  };
  return { basalt: igsnOf("Basalt 42"), granite: igsnOf("Granite 7") };
}

test.describe("search facets", () => {
  test("a reader narrows results with a facet and can clear it", async ({
    page,
    samples,
  }) => {
    const { basalt, granite } = published(samples);
    const list = sampleListPage(page);

    // Both published seed samples are igneous rocks, so the material facet URL
    // lists the two and reveals the sidebar.
    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleLink("Granite 7", granite);

    // Narrowing by nature keeps only the hand sample (Basalt 42).
    await list.pickFacet("Nature", natureLabel("hand_sample"), "nature");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");

    // Clearing every filter returns the search invite, with the facet sidebar
    // still up so the reader can pick another one.
    await list.clearAllFilters();
    await list.expectSearchInvite();
    await list.expectFacetsVisible();
  });

  test("a shared facet URL restores the filtered results", async ({
    page,
    samples,
  }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    // Landing straight on a facet URL (a shared link) restores the filter.
    await list.gotoWithSearch("nature=hand_sample");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader drills a hierarchy facet deeper through the cascade", async ({
    page,
    samples,
  }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    // Both igneous samples show; the cascade then offers the igneous sub-levels.
    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

    // Choosing Volcanic under Igneous keeps only the basalt (Granite 7 is
    // plutonic), proving the cascade combobox drives the filter, not just a URL.
    await list.chooseFacetOption("Igneous", "Volcanic");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader narrows a location search with the facets", async ({
    page,
    samples,
  }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    // A box over France holds both published seed samples. The sidebar is up on
    // the location engine too: a box search is refinable like a text one.
    await list.gotoWithSearch("engine=location&bbox=-10,40,10,50");
    await list.expectFacetsVisible();
    await list.expectResultCount(2);

    // Narrowing by nature keeps the box and drops the thin section.
    await list.pickFacet("Nature", natureLabel("hand_sample"), "nature");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader narrows by a text facet", async ({ page, samples }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

    // Only Basalt 42 records this collector; Granite 7 is a historical specimen
    // with a curator instead, so it drops out.
    await list.fillTextFacet("Collector", "Claire Martin", "collectorName");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader narrows by the age range facet", async ({ page, samples }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

    // Basalt 42 carries a 2-6 Ma age; Granite 7 has none, so any lower bound
    // (default Ma) narrows to the dated sample.
    await list.fillAgeMin("1");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });
});
