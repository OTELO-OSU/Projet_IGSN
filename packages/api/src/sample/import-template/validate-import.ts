import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type ExcelJS from "exceljs";

import { formatDate } from "@projet-igsn/domain/date/format-date";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";

import type { TemplateLayout } from "./template-layout.ts";

import { queueBuild } from "./build-queue.ts";
import { buildSampleInputs } from "./build-sample-inputs.ts";
import { DATA_SHEETS, plainHeader, SHEETS } from "./columns.ts";
import { openWorkbook } from "./open-workbook.ts";
import { cellValue, readRows } from "./read-rows.ts";
import { templateLayout } from "./template-layout.ts";
import { validateSamples } from "./validate-samples.ts";

const displayedText = (value: Date | string) => {
  if (!(value instanceof Date)) return value;
  const [date, time] = [formatDate(value), value.toISOString().slice(11, 16)];
  return time === "00:00" ? date : `${date} ${time}`;
};

const TEMPLATE_COLUMNS = new Map(
  DATA_SHEETS.map(({ name, columns }, sheetIndex) => [
    name,
    {
      sheetIndex,
      size: columns.length,
      byHeader: new Map(
        columns.map((column, index) => [
          plainHeader(column),
          { column, index },
        ]),
      ),
    },
  ]),
);

const templateColumnOf = (
  sheet: string | undefined,
  header: string | undefined,
) =>
  sheet === undefined || header === undefined
    ? undefined
    : TEMPLATE_COLUMNS.get(sheet)?.byHeader.get(header);

function withValue(
  book: ExcelJS.Workbook,
  layout: TemplateLayout,
  issue: ImportIssue,
): ImportIssue {
  const { sheet, row, column } = issue;
  if (row === undefined) return issue;
  const number = layout
    .find(({ name }) => name === sheet)
    ?.columns.find((candidate) => plainHeader(candidate) === column)?.number;
  const cell =
    number === undefined
      ? undefined
      : book.getWorksheet(sheet)?.getCell(row, number);
  const value = cell && cellValue(cell);
  return value === undefined
    ? issue
    : { ...issue, value: displayedText(value) };
}

const fieldOf = ({ sheet, row, column }: ImportIssue) =>
  JSON.stringify([
    sheet,
    row,
    templateColumnOf(sheet, column)?.column.path ?? column,
  ]);

function positionOf({
  sheet,
  row = 0,
  column,
}: ImportIssue): [number, number, number] {
  const template =
    sheet === undefined ? undefined : TEMPLATE_COLUMNS.get(sheet);
  return [
    template?.sheetIndex ?? -1,
    row,
    templateColumnOf(sheet, column)?.index ?? template?.size ?? 0,
  ];
}

function byPosition(a: ImportIssue, b: ImportIssue): number {
  const [p, q] = [positionOf(a), positionOf(b)];
  return p[0] - q[0] || p[1] - q[1] || p[2] - q[2];
}

type ValidatedImport = { issues: ImportIssue[]; samples: CreateSample[] };

const rejected = (issues: ImportIssue[]): ValidatedImport => ({
  issues,
  samples: [],
});

function validateRows(parsed: ReturnType<typeof readRows>): ValidatedImport {
  const built = buildSampleInputs(parsed);
  const reported = new Set(built.issues.map(fieldOf));
  const { issues, inputs } = validateSamples(built.samples);
  return {
    issues: [
      ...built.issues,
      ...issues.filter((issue) => !reported.has(fieldOf(issue))),
    ],
    samples: inputs,
  };
}

export function validateImport(bytes: ArrayBuffer): Promise<ValidatedImport> {
  return queueBuild(async () => {
    const book = await openWorkbook(bytes);
    if (book === undefined) return rejected([{ code: "unreadable_file" }]);
    const { layout, issues } = templateLayout(book);
    if (issues.length > 0) return rejected(issues);
    const parsed = readRows(book, layout);
    if (parsed.samples.length === 0)
      return rejected([{ sheet: SHEETS.samples, code: "no_sample" }]);
    if (parsed.samples.length > MAX_IMPORT_ROWS)
      return rejected([{ sheet: SHEETS.samples, code: "too_many_rows" }]);
    const validated = validateRows(parsed);
    return {
      issues: validated.issues
        .map((issue) => withValue(book, layout, issue))
        .sort(byPosition),
      samples: validated.samples,
    };
  });
}
