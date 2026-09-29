import { expect, type Page, type TestInfo } from "@playwright/test";

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
  return {
    open: () =>
      page.getByRole("button", { name: "Import", exact: true }).click(),
    downloadTemplate: (testInfo: TestInfo) =>
      saveDownload(page, testInfo, () =>
        dialog.getByRole("button", { name: "Download template" }).click(),
      ),
    reserveInternalIds: async (count: number, testInfo: TestInfo) => {
      await dialog
        .getByRole("button", { name: "Reserve internal IDs" })
        .click();
      const reserve = page.getByRole("dialog", {
        name: "Reserve internal IDs",
      });
      await reserve.getByLabel("Number of internal IDs").fill(String(count));
      return saveDownload(page, testInfo, () =>
        reserve
          .getByRole("button", { name: "Download template with reserved IDs" })
          .click(),
      );
    },
    upload: (path: string) =>
      dialog.locator('input[type="file"]').setInputFiles(path),
    submit: () =>
      dialog.getByRole("button", { name: "Import", exact: true }).click(),
    expectIssue: async (sheet: string, problem: string) => {
      await expect(
        dialog.getByText(
          "The file was not imported and nothing was saved. Fix the problems below, then upload it again.",
        ),
      ).toBeVisible();
      await expect(
        dialog
          .getByRole("table", { name: sheet })
          .getByRole("row")
          .filter({ has: page.getByRole("cell", { name: problem }) }),
      ).toBeVisible();
    },
    expectOpen: () => expect(dialog).toBeVisible(),
  };
}
