import { expect, type Page, type TestInfo } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";

import { sampleListPage, sampleRow } from "./sample-list.page";

type Sheet = {
  getRow: (row: number) => {
    values: unknown[];
    getCell: (column: number) => { value: unknown };
  };
  spliceColumns: (start: number, count: number) => void;
};

type Workbook = {
  xlsx: {
    readFile: (file: string) => Promise<unknown>;
    writeFile: (file: string) => Promise<unknown>;
  };
  getWorksheet: (name: string) => Sheet | undefined;
};

const { Workbook } = createRequire(
  path.join(__dirname, "../../../packages/api/package.json"),
)("exceljs") as { Workbook: new () => Workbook };

const HEADER_ROW = 2;
const FIRST_DATA_ROW = 3;

type ExportEdits = {
  cells?: { sample: number; column: string; value: string }[];
  deletedColumns?: string[];
};

function columnOf(sheet: Sheet, header: string) {
  const column = sheet
    .getRow(HEADER_ROW)
    .values.findIndex(
      (value) =>
        typeof value === "string" && value.replace(" *", "") === header,
    );
  if (column < 1) throw new Error(`the export must hold a "${header}" column`);
  return column;
}

export async function editExport(
  file: string,
  { cells = [], deletedColumns = [] }: ExportEdits,
) {
  const workbook = new Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet("Samples");
  if (!sheet) throw new Error("the export must hold a Samples sheet");
  for (const { sample, column, value } of cells) {
    sheet
      .getRow(FIRST_DATA_ROW + sample)
      .getCell(columnOf(sheet, column)).value = value;
  }
  for (const column of deletedColumns) {
    sheet.spliceColumns(columnOf(sheet, column), 1);
  }
  await workbook.xlsx.writeFile(file);
}

export function bulkEditPage(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Bulk edit" });
  return {
    exportSample: async (name: string, testInfo: TestInfo) => {
      const list = sampleListPage(page);
      await list.expectVisible();
      await page.getByRole("checkbox", { name: `Select ${name}` }).check();
      const download = await list.exportAllSamples();
      const file = testInfo.outputPath(download.suggestedFilename());
      await download.saveAs(file);
      return file;
    },
    upload: async (file: string) => {
      await dialog.locator('input[type="file"]').setInputFiles(file);
      await dialog.getByRole("button", { name: "Import", exact: true }).click();
    },
    expectAccepted: (count: number) =>
      expect(
        page.getByText(
          `${count} samples imported. Publication is running in the background.`,
        ),
      ).toBeVisible(),
    expectIssue: (problem: string) =>
      expect(
        dialog
          .getByRole("table", { name: "Samples" })
          .getByRole("cell", { name: problem, exact: true }),
      ).toBeVisible(),
    expectPublishedAfterReload: (name: string) =>
      expect(async () => {
        await page.reload();
        await expect(
          sampleRow(page, name).getByRole("cell", {
            name: "Published",
            exact: true,
          }),
        ).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 }),
  };
}
