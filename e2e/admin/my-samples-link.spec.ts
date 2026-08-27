import { settingsPage } from "../support/admin/settings.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { expect, published, test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";
import { frontendUrl } from "../support/urls";

test.describe("my samples link", () => {
  test("a researcher shares the public list of their samples", async ({
    page,
    samples,
  }) => {
    const { basalt } = published(samples);

    await signInAsResearcher(page, RESEARCHERS.jean);
    const settings = settingsPage(page);
    await settings.open();
    const link = await settings.mySamplesLink();
    expect(link).toContain(`${frontendUrl}/search?contributor=`);

    const list = sampleListPage(page);
    await list.gotoWithSearch(link.split("?")[1]!);
    await list.expectFacetValue("Contributor", "Jean Martin");
    await list.expectSampleLink("Basalt 42", basalt);
  });
});
