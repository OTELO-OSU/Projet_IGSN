import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

import { importSamplesPage } from "../support/admin/import-samples.page";
import { sampleListPage, sampleRow } from "../support/admin/sample-list.page";
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

  test("a researcher imports a publishable file and sees it published", async ({
    page,
  }, testInfo) => {
    await signInAsResearcher(page, RESEARCHERS.jean);
    await sampleListPage(page).expectVisible();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const file = testInfo.outputPath("clean-import.xlsx");
    // ponytail: same hard-coded container as db.ts; the api generates the publishable workbook so the fixture never drifts from the template.
    const base64 = execFileSync(
      "docker",
      ["exec", "igsn-e2e-api-1", "node", "scripts/write-clean-import.ts"],
      { encoding: "utf8" },
    ).trim();
    await writeFile(file, Buffer.from(base64, "base64"));
    await importSamples.upload(file);
    await importSamples.submit();

    await expect(
      page.getByText(
        "1 samples imported. Publication is running in the background.",
      ),
    ).toBeVisible();

    // The background worker publishes within one POLL_MS tick; the list needs a reload to see it.
    await expect(async () => {
      await page.reload();
      await expect(
        sampleRow(page, "Basalt 1").getByRole("cell", {
          name: "Published",
          exact: true,
        }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  });
});
