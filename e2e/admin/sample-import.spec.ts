import { importSamplesPage } from "../support/admin/import-samples.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

test.describe("sample import", () => {
  test("a researcher uploads the empty template and reads why it was refused", async ({
    page,
  }, testInfo) => {
    await signInAsResearcher(page, RESEARCHERS.jean);
    await sampleListPage(page).expectVisible();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const template = await importSamples.downloadTemplate(testInfo);
    await importSamples.upload(template);
    await importSamples.submit();

    await importSamples.expectIssue("Samples", "The file holds no sample.");
    await importSamples.expectOpen();
  });
});
