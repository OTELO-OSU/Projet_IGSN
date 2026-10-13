import { expect, type Page, type TestInfo } from "@playwright/test";

import { sampleRow } from "./sample-list.page.ts";

async function saveDownload(
  page: Page,
  testInfo: TestInfo,
  click: () => Promise<void>,
) {
  const download = page.waitForEvent("download");
  await click();
  const file = await download;
  const path = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(path);
  return path;
}

export function importSamplesPage(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Import samples" });
  const expectQueued = () =>
    expect(
      page.getByText(
        "1 samples imported. Publication is running in the background.",
      ),
    ).toBeVisible();
  return {
    open: () =>
      page.getByRole("button", { name: "Bulk import", exact: true }).click(),
    downloadTemplate: async (testInfo: TestInfo) => {
      await dialog.getByRole("button", { name: "Download template" }).click();
      return saveDownload(page, testInfo, () =>
        page.getByRole("menuitem", { name: "Complete template" }).click(),
      );
    },
    upload: (path: string) =>
      dialog.getByLabel("choose one").setInputFiles(path),
    addDocument: (path: string) =>
      dialog.getByLabel("choose them").setInputFiles(path),
    submit: () =>
      dialog.getByRole("button", { name: "Import", exact: true }).click(),
    expectPublishedInBackground: async (name: string) => {
      await expectQueued();
      await expect(async () => {
        for (const badge of ["Published", "Synchronized"]) {
          await expect(
            sampleRow(page, name).getByText(badge, { exact: true }),
          ).toBeVisible({ timeout: 2_000 });
        }
      }).toPass({ timeout: 30_000 });
    },
  };
}
