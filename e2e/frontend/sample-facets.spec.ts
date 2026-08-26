import { test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";
import { natureLabel } from "../support/nature-label";

function published(samples: { name: string; igsn: string | null }[]) {
  const igsnOf = (name: string) => {
    const igsn = samples.find((s) => s.name === name)?.igsn;
    if (!igsn) throw new Error(`seed must publish "${name}"`);
    return igsn;
  };
  return { basalt: igsnOf("Basalt 42"), granite: igsnOf("Granite 7") };
}

const GROUP_FACET = "Other group (team, project…)";

test.describe("search facets", () => {
  test("a reader narrows results with a facet and can clear it", async ({
    page,
    samples,
  }) => {
    const { basalt, granite } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock.igneous");
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

  test("a shared facet URL restores the filtered results", async ({
    page,
    samples,
  }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

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

    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

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

    await list.gotoWithSearch("bbox=-10,40,10,50");
    await list.expectFacetsVisible();
    await list.expectResultCount(2);

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

    await list.fillAgeMin("1");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader narrows by the institutional facets", async ({
    page,
    samples,
  }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

    await list.pickFacet(
      "Organization",
      "Université de Lorraine",
      "institutionalOrganization",
    );
    await list.expectResultCount(2);
    await list.expectFacetOptionAbsent(
      "Laboratory",
      "Institut des Sciences de la Terre (ISTerre)",
    );

    await list.pickFacet(
      "Laboratory",
      "GéoRessources (GEORESSOURCES)",
      "institutionalLaboratory",
    );
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader narrows by an other group", async ({ page, samples }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

    await list.expectFacetOptionAbsent(GROUP_FACET, "OZCAR-RI");
    await list.pickFacet(GROUP_FACET, "ANR CritMet", "manualGroup");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });

  test("a reader narrows by a contributor", async ({ page, samples }) => {
    const { basalt } = published(samples);
    const list = sampleListPage(page);

    await list.gotoWithSearch("material=rock.igneous");
    await list.expectResultCount(2);

    await list.expectFacetOptionAbsent("Contributor", "Camille Petit");
    await list.pickFacet("Contributor", "Jean Martin", "contributor");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });
});
