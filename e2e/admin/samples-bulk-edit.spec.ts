import { bulkEditPage, editExport } from "../support/admin/bulk-edit.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { sampleNamed, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("samples bulk edit", () => {
  test("a researcher re-imports an edited export and sees the sample republished", async ({
    page,
    samples,
  }, testInfo) => {
    const basalt = sampleNamed(samples, "Basalt 42");
    await signInAsResearcher(page, RESEARCHERS.jean);
    const bulkEdit = bulkEditPage(page);
    const file = await bulkEdit.exportSample(basalt.name, testInfo);
    await editExport(file, {
      cells: [{ sample: 0, column: "Name", value: "Basalt 42 revised" }],
      deletedColumns: ["Name of the research programme"],
    });

    await bulkEdit.upload(file);

    await bulkEdit.expectAccepted(1);
    await bulkEdit.expectPublishedAfterReload("Basalt 42 revised");
    const detail = sampleDetailPage(page);
    await detail.goto(basalt.igsn);
    await detail.expectSample("Basalt 42 revised", basalt.igsn);
    await detail.expectResearchProgram("Chaîne des Puys Survey");
  });

  test("a researcher reads why an export with an unknown Sample # and a changed IGSN was refused", async ({
    page,
    samples,
  }, testInfo) => {
    const basalt = sampleNamed(samples, "Basalt 42");
    await signInAsResearcher(page, RESEARCHERS.jean);
    const bulkEdit = bulkEditPage(page);
    const file = await bulkEdit.exportSample(basalt.name, testInfo);
    await editExport(file, {
      cells: [
        { sample: 0, column: "IGSN", value: "CHANGED" },
        { sample: 1, column: "Sample #", value: "sample-999999" },
        { sample: 1, column: "Name", value: "Ghost" },
      ],
    });

    await bulkEdit.upload(file);

    await bulkEdit.expectIssue("No sample has this Sample #.");
    await bulkEdit.expectIssue(
      "This cell cannot change once the sample is published.",
    );
    await bulkEdit.expectPublishedAfterReload(basalt.name);
  });
});
