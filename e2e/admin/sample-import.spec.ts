import { expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";

import { importSamplesPage } from "../support/admin/import-samples.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import {
  FIRST_DATA_ROW,
  HEADER_ROW,
  fillTemplateSample,
  openSamplesSheet,
} from "../support/admin/template-workbook";
import { test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

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
  const headers = sheet.getRow(HEADER_ROW).values;
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
    "Provenance status": "Research project sample",
    ...sample,
  });
  await fillTemplateAttachments(template, attachments);
  return template;
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
      "To add",
    );
    await importSamplesPage(page).addDocument(fixture(attachment["File name"]));
    await expect(attachmentRow(page, attachment["File name"])).toContainText(
      "Added",
    );
  }
}

test.describe("sample import", () => {
  test("a researcher imports a cruise sample with two documents, following each upload, and the public page serves them", async ({
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
      {
        "Sample name": name,
        "Name of the research programme": "MAR-12",
      },
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
    await detail.expectResearchProgram("MAR-12");
    for (const attachment of [NOTES, PHOTO]) {
      await detail.expectAttachment(attachment.Title);
    }
    const href = await detail.attachmentDownloadHref(NOTES["File name"]);
    expect(href).not.toBeNull();
    const download = await page.request.get(href!);
    expect(download.status()).toBe(200);
    expect(await download.text()).toContain("Lorem ipsum dolor sit amet");
  });
});
