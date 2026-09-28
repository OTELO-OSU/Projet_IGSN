import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";

import { render } from "../../test/render.tsx";
import { ImportReport } from "./import-report.tsx";

const cellTexts = (table: Element) =>
  Array.from((table as HTMLTableElement).rows, (row) =>
    Array.from(row.cells, (cell) => cell.textContent),
  );

describe("ImportReport", () => {
  it("should render one table per sheet in received order, row, column and value blank when absent", async () => {
    const screen = await render(
      <ImportReport
        issues={[
          {
            sheet: "Samples",
            row: 3,
            column: "Nature",
            value: "Big rock",
            code: "not_applicable",
          },
          { sheet: "Storage", column: "Sample #", code: "missing_column" },
          { sheet: "Samples", row: 5, code: "duplicate_value" },
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
      ["Row", "Column", "Value", "Problem"],
      [
        "3",
        "Nature",
        "Big rock",
        "This cell does not apply to this sample and must stay empty.",
      ],
      [
        "5",
        "",
        "",
        "This value differs from the one already given for the same sample.",
      ],
    ]);
    expect(
      cellTexts(screen.getByRole("table", { name: "Storage" }).element()),
    ).toEqual([
      ["Row", "Column", "Value", "Problem"],
      ["", "Sample #", "", "This required column is missing from the sheet."],
    ]);
  });

  it("should group an issue naming no sheet under the file", async () => {
    const screen = await render(
      <ImportReport issues={[{ code: "unreadable_file" }]} />,
    );

    expect(
      cellTexts(screen.getByRole("table", { name: "File" }).element()),
    ).toEqual([
      ["Row", "Column", "Value", "Problem"],
      ["", "", "", "This file cannot be read as an Excel workbook."],
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
    ).toEqual(["3", "", "", problem]);
  });

  it("should truncate a value past 140 characters and reveal it whole on focus", async () => {
    const value = `${"a".repeat(140)}b`;
    const screen = await render(
      <ImportReport
        issues={[{ sheet: "Samples", row: 3, value, code: "custom" }]}
      />,
    );

    screen
      .getByText(`${"a".repeat(140)}…`)
      .element()
      .focus();

    await expect.element(screen.getByRole("tooltip")).toHaveTextContent(value);
  });

  it("should show a value of 140 characters as is", async () => {
    const value = "a".repeat(140);
    const screen = await render(
      <ImportReport
        issues={[{ sheet: "Samples", row: 3, value, code: "custom" }]}
      />,
    );

    expect(
      cellTexts(screen.getByRole("table", { name: "Samples" }).element())[1],
    ).toEqual(["3", "", value, "Invalid value."]);
  });
});
