import { expect, type Page, type TestInfo } from "@playwright/test";

import { chooseOption } from "./choose-option.ts";
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
    downloadCustomizedTemplate: async (
      {
        provenance,
        manualGroup,
        uncheckSections = [],
      }: {
        provenance: string;
        manualGroup: string;
        uncheckSections?: string[];
      },
      testInfo: TestInfo,
    ) => {
      await dialog.getByRole("button", { name: "Download template" }).click();
      await page.getByRole("menuitem", { name: "Customized template" }).click();
      const customize = page.getByRole("dialog", {
        name: "Customize the template",
      });
      const choose = chooseOption(page, customize);
      await choose(/^Manual group/, manualGroup);
      await choose(/^Provenance status/, provenance);
      for (const name of uncheckSections) {
        await customize.getByRole("checkbox", { name, exact: true }).click();
      }
      return saveDownload(page, testInfo, () =>
        customize
          .getByRole("button", { name: "Download this template" })
          .click(),
      );
    },
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
    continueDespiteDuplicate: async (name: string) => {
      const warning = page.getByRole("dialog", {
        name: "Possible duplicate sample",
      });
      await expect(warning.getByRole("link", { name })).toBeVisible();
      await warning.getByRole("button", { name: "Continue anyway" }).click();
    },
    expectQueued,
    expectOpen: () => expect(dialog).toBeVisible(),
    expectPublishedInBackground: async (name: string) => {
      await expectQueued();
      await expect(async () => {
        await page.reload();
        for (const badge of ["Published", "Synchronized"]) {
          await expect(
            sampleRow(page, name).getByText(badge, { exact: true }),
          ).toBeVisible({ timeout: 2_000 });
        }
      }).toPass({ timeout: 30_000 });
    },
  };
}
