import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { expect, test } from "../support/db";

test.describe("samples export", () => {
  test("a researcher exports their samples to an Excel file", async ({
    page,
  }) => {
    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.expectVisible();

    const download = await list.exportAllSamples();

    expect(download.suggestedFilename()).toMatch(
      /^igsn-samples-export-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
  });
});
