import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

import { importSamplesPage } from "../support/admin/import-samples.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { templateInternalIds } from "../support/admin/template-internal-ids";
import { fillTemplateSample } from "../support/admin/template-workbook";
import { lastInternalNumber, test } from "../support/db";

const MANUAL_GROUP = "ANR CritMet";

const CUSTOMIZED_SAMPLE = {
  "Sample type (level 1)": "Individual sample",
  Nature: "Hand sample",
  "Material (level 2)": "Rock",
  "Material (level 3)": "Igneous",
  "Collector first name": "Marie",
  "Collector last name": "Curie",
  "Collection date precision": "Day",
  "Collection date start": "2024-01-15",
  "Collection date end": "2024-01-20",
  "Position type": "Point",
  Longitude: 2.35,
  Latitude: 45.2,
  "Region (level 1)": "Country",
  "Region (level 2)": "France",
};

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

    await importSamples.expectPublishedInBackground("Basalt 1");
  });

  test("a researcher imports a customized template and publishes the sample under its manual group", async ({
    page,
  }, testInfo) => {
    const name = `Basalt ${Date.now()}`;
    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.expectVisible();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const template = await importSamples.downloadCustomizedTemplate(
      {
        provenance: "Field sample",
        manualGroup: MANUAL_GROUP,
        uncheckSections: ["Curation and repository"],
      },
      testInfo,
    );
    await fillTemplateSample(template, { ...CUSTOMIZED_SAMPLE, Name: name });
    await importSamples.upload(template);
    await importSamples.submit();

    await importSamples.expectPublishedInBackground(name);
    await list.openSample(name);
    await sampleEditPage(page).expectManualGroupFrozen(MANUAL_GROUP);
  });

  test("a researcher reserves internal IDs following the last published sample", async ({
    page,
  }, testInfo) => {
    await signInAsResearcher(page, RESEARCHERS.jean);
    await sampleListPage(page).expectVisible();
    const last = lastInternalNumber();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const template = await importSamples.reserveInternalIds(3, testInfo);

    expect(await templateInternalIds(template)).toEqual([
      `sample-${last + 1}`,
      `sample-${last + 2}`,
      `sample-${last + 3}`,
    ]);
  });
});
