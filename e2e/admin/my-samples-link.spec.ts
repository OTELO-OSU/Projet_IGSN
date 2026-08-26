import { settingsPage } from "../support/admin/settings.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { expect, test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";
import { frontendUrl } from "../support/urls";

test.describe("my samples link", () => {
  test("a researcher shares the public list of their samples", async ({
    page,
    samples,
  }) => {
    const basalt = samples.find((sample) => sample.name === "Basalt 42")?.igsn;
    if (!basalt) throw new Error('seed must publish "Basalt 42"');

    await signInAsResearcher(page, RESEARCHERS.jean);
    const settings = settingsPage(page);
    await settings.open();
    const link = await settings.mySamplesLink();
    expect(link).toContain(`${frontendUrl}/search?contributor=`);

    const list = sampleListPage(page);
    await list.gotoWithSearch(link.split("?")[1]!);
    await list.expectFacetValue("Contributor", "Jean Martin");
    await list.expectResultCount(1);
    await list.expectSampleLink("Basalt 42", basalt);
    await list.expectSampleAbsent("Granite 7");
  });
});
