import { expect, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { importSamplesPage } from "../support/admin/import-samples.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { templateInternalIds } from "../support/admin/template-internal-ids";
import {
  FIRST_DATA_ROW,
  fillTemplateSample,
  openSamplesSheet,
} from "../support/admin/template-workbook";
import { lastInternalNumber, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

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

const NOTES = {
  "Sample #": 1,
  "File name": "test.txt",
  Title: "Field notes",
  "Resource type": "Dataset",
  Description: "Notes taken on the sampling day.",
};

const PHOTO = {
  "Sample #": 1,
  "File name": "test.png",
  Title: "Outcrop photo",
  "Resource type": "Image",
  Description: "The outcrop the sample was taken from.",
};

const STAGED_UPLOADS = /\/admin\/samples\/import\/uploads\//;

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

async function fillTemplateAttachments(
  file: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  const { book } = await openSamplesSheet(file);
  const sheet = book.getWorksheet("Attachments");
  if (!sheet) throw new Error("the template must hold an Attachments sheet");
  const headers = sheet.getRow(FIRST_DATA_ROW - 1).values;
  for (const [index, cells] of rows.entries()) {
    for (const [header, value] of Object.entries(cells)) {
      const column = headers.indexOf(header);
      if (column === -1)
        throw new Error(`the template has no ${header} column`);
      sheet.getCell(FIRST_DATA_ROW + index, column).value = value;
    }
  }
  await book.xlsx.writeFile(file);
}

async function templateWithAttachments(
  page: Page,
  testInfo: TestInfo,
  sample: Record<string, unknown>,
  attachments: Record<string, unknown>[],
): Promise<string> {
  const template = await importSamplesPage(page).downloadTemplate(testInfo);
  await fillTemplateSample(template, {
    ...CUSTOMIZED_SAMPLE,
    "Material (level 1)": "Rock and sediment",
    "Provenance status": "Field sample",
    ...sample,
  });
  await fillTemplateAttachments(template, attachments);
  return template;
}

async function writeCleanImport(testInfo: TestInfo): Promise<string> {
  const file = testInfo.outputPath("clean-import.xlsx");
  // ponytail: same hard-coded container as db.ts; the api generates the publishable workbook so the fixture never drifts from the template.
  const base64 = execFileSync(
    "docker",
    ["exec", "igsn-e2e-api-1", "node", "scripts/write-clean-import.ts"],
    { encoding: "utf8" },
  ).trim();
  await writeFile(file, Buffer.from(base64, "base64"));
  return file;
}

const attachmentRow = (page: Page, fileName: string) =>
  page
    .getByRole("dialog", { name: "Import samples" })
    .getByRole("list", { name: "Attached documents" })
    .getByRole("listitem")
    .filter({ hasText: fileName });

async function addDocuments(
  page: Page,
  attachments: { "File name": string }[],
): Promise<void> {
  for (const attachment of attachments) {
    await expect(attachmentRow(page, attachment["File name"])).toContainText(
      "Missing",
    );
    await importSamplesPage(page).upload(fixture(attachment["File name"]));
    await expect(attachmentRow(page, attachment["File name"])).toContainText(
      "Added",
    );
  }
}

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
    await importSamples.upload(await writeCleanImport(testInfo));
    await importSamples.submit();

    await importSamples.expectPublishedInBackground("Basalt 1");
  });

  test("a researcher importing the same file twice is warned of the duplicate, then imports it anyway", async ({
    page,
  }, testInfo) => {
    await signInAsResearcher(page, RESEARCHERS.jean);
    await sampleListPage(page).expectVisible();
    const file = await writeCleanImport(testInfo);
    const importSamples = importSamplesPage(page);
    await importSamples.open();
    await importSamples.upload(file);
    await importSamples.submit();
    await importSamples.expectPublishedInBackground("Basalt 1");

    await importSamples.open();
    await importSamples.upload(file);
    await importSamples.submit();
    await importSamples.continueDespiteDuplicate("Basalt 1");

    await importSamples.expectQueued();
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

  test("a researcher imports a sample with two documents, following each upload, and the public page serves them", async ({
    page,
  }, testInfo) => {
    const name = `Basalt ${Date.now()}`;
    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.expectVisible();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const template = await templateWithAttachments(
      page,
      testInfo,
      { Name: name },
      [NOTES, PHOTO],
    );
    await importSamples.upload(template);
    await addDocuments(page, [NOTES, PHOTO]);
    const { promise: uploadsHeld, resolve: releaseUploads } =
      Promise.withResolvers<void>();
    await page.route(STAGED_UPLOADS, async (route) => {
      if (route.request().method() === "PATCH") await uploadsHeld;
      await route.continue();
    });
    const { promise: importHeld, resolve: releaseImport } =
      Promise.withResolvers<void>();
    await page.route(/\/admin\/samples\/import$/, async (route) => {
      await importHeld;
      await route.continue();
    });
    await importSamples.submit();

    const upload = page.getByRole("dialog", { name: "Importing samples" });
    await expect(
      upload.getByRole("progressbar", { name: "Uploading the documents" }),
    ).toBeVisible();
    await expect(
      upload.getByText(`File 1/2: ${NOTES["File name"]}`, { exact: true }),
    ).toBeVisible();
    releaseUploads();
    await expect(
      upload.getByRole("progressbar", { name: "Creating the samples" }),
    ).toBeVisible();
    releaseImport();
    await importSamples.expectPublishedInBackground(name);

    await list.openSample(name);
    const igsn = await sampleEditPage(page).publicPageIgsn();
    const detail = sampleDetailPage(page);
    await detail.goto(igsn);
    for (const attachment of [NOTES, PHOTO]) {
      await detail.expectAttachment(attachment.Title);
    }
    const href = await detail.attachmentDownloadHref(NOTES["File name"]);
    expect(href).not.toBeNull();
    const download = await page.request.get(href!);
    expect(download.status()).toBe(200);
    expect(await download.text()).toContain("Lorem ipsum dolor sit amet");
  });

  test("a researcher corrects a refused file and imports it without uploading its documents again", async ({
    page,
  }, testInfo) => {
    const name = `Basalt ${Date.now()}`;
    await signInAsResearcher(page, RESEARCHERS.jean);
    await sampleListPage(page).expectVisible();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const corrected = await templateWithAttachments(
      page,
      testInfo,
      { Name: name },
      [NOTES],
    );
    const refused = testInfo.outputPath("refused.xlsx");
    await copyFile(corrected, refused);
    await fillTemplateSample(refused, { Longitude: 200 });
    let stagedUploadRequests = 0;
    await page.route(STAGED_UPLOADS, (route) => {
      stagedUploadRequests += 1;
      return route.continue();
    });
    await importSamples.upload(refused);
    await addDocuments(page, [NOTES]);
    await importSamples.submit();

    const dialog = page.getByRole("dialog", { name: "Import samples" });
    await expect(
      dialog.getByText(
        "The file was not imported and nothing was saved. Fix the problems below, then upload it again.",
      ),
    ).toBeVisible();
    const uploadsBeforeResubmit = stagedUploadRequests;
    expect(uploadsBeforeResubmit).toBeGreaterThan(0);
    await dialog.getByRole("button", { name: /^Remove the workbook/ }).click();
    await importSamples.upload(corrected);
    await addDocuments(page, [NOTES]);
    await importSamples.submit();

    await importSamples.expectPublishedInBackground(name);
    expect(stagedUploadRequests).toBe(uploadsBeforeResubmit);
  });

  test("a researcher's import survives a document chunk lost on the network", async ({
    page,
  }, testInfo) => {
    const name = `Basalt ${Date.now()}`;
    await signInAsResearcher(page, RESEARCHERS.jean);
    await sampleListPage(page).expectVisible();

    const importSamples = importSamplesPage(page);
    await importSamples.open();
    const template = await templateWithAttachments(
      page,
      testInfo,
      { Name: name },
      [NOTES],
    );
    await importSamples.upload(template);
    await addDocuments(page, [NOTES]);
    let isChunkLost = false;
    await page.route(STAGED_UPLOADS, (route) => {
      if (route.request().method() !== "PATCH" || isChunkLost)
        return route.continue();
      isChunkLost = true;
      return route.abort("connectionreset");
    });
    await importSamples.submit();

    await importSamples.expectPublishedInBackground(name);
    expect(isChunkLost).toBe(true);
  });
});
