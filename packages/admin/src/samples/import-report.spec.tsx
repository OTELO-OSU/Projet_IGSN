import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";

import { render } from "../../test/render.tsx";
import { ImportReport } from "./import-report.tsx";

const cellTexts = (table: Element) =>
  Array.from((table as HTMLTableElement).rows, (row) =>
    Array.from(row.cells, (cell) => cell.textContent),
  );

describe("ImportReport", () => {
  it("should render one table per sheet in received order, row and column blank when absent", async () => {
    const screen = await render(
      <ImportReport
        issues={[
          { sheet: "Samples", row: 3, column: "Nature", code: "unknown_value" },
          { sheet: "Storage", column: "Sample #", code: "missing_column" },
          { sheet: "Samples", row: 5, code: "not_a_number" },
        ]}
      />,
    );

    await expect
      .element(screen.getByText(/not imported and nothing was saved/))
      .toBeVisible();
    expect(
      screen
        .getByRole("heading")
        .elements()
        .map((h) => h.textContent),
    ).toEqual(["Samples", "Storage"]);
    expect(
      cellTexts(screen.getByRole("table", { name: "Samples" }).element()),
    ).toEqual([
      ["Row", "Column", "Problem"],
      ["3", "Nature", "This value is not one of the choices of the list."],
      ["5", "", "This value is not a number."],
    ]);
    expect(
      cellTexts(screen.getByRole("table", { name: "Storage" }).element()),
    ).toEqual([
      ["Row", "Column", "Problem"],
      ["", "Sample #", "This required column is missing from the sheet."],
    ]);
  });

  it("should group an issue naming no sheet under the file", async () => {
    const screen = await render(
      <ImportReport issues={[{ code: "unreadable_file" }]} />,
    );

    expect(
      cellTexts(screen.getByRole("table", { name: "File" }).element()),
    ).toEqual([
      ["Row", "Column", "Problem"],
      ["", "", "This file cannot be read as an Excel workbook."],
    ]);
  });

  it.each<{ reason: string; issue: ImportIssue; problem: string }>([
    {
      reason: "a publish blocker by its admin label",
      issue: { sheet: "Samples", row: 3, code: "nature_missing" },
      problem: "Set the nature before publishing.",
    },
    {
      reason: "an unknown code by the server message",
      issue: {
        sheet: "Samples",
        row: 3,
        code: "too_small",
        message: "Too small: expected number to be >=0",
      },
      problem: "Too small: expected number to be >=0",
    },
    {
      reason: "an unknown code without message as an invalid value",
      issue: { sheet: "Samples", row: 3, code: "custom" },
      problem: "Invalid value.",
    },
  ])("should describe $reason", async ({ issue, problem }) => {
    const screen = await render(<ImportReport issues={[issue]} />);

    expect(
      cellTexts(screen.getByRole("table", { name: "Samples" }).element())[1],
    ).toEqual(["3", "", problem]);
  });
});
