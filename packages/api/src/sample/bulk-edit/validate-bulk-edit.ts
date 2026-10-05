import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";

import type { ParsedRows } from "../import-template/read-rows.ts";
import type { TemplateLayout } from "../import-template/template-layout.ts";

import { queueBuild } from "../import-template/build-queue.ts";
import {
  type Column,
  plainHeader,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "../import-template/columns.ts";
import { openWorkbook } from "../import-template/open-workbook.ts";
import { readRows, textOf } from "../import-template/read-rows.ts";
import { reportProcessStepsWithoutParent } from "../import-template/report-process-steps-without-parent.ts";
import { templateLayout } from "../import-template/template-layout.ts";
import {
  byPosition,
  internalNumberOf,
  rejected,
  validateRows,
  withValue,
} from "../import-template/validate-import.ts";
import {
  EXPORT_CHILD_SHEETS,
  EXPORT_SAMPLE_COLUMNS,
} from "./export-columns.ts";
import { isFrozen } from "./export-workbook.ts";
import { mergeStoredSample } from "./merge-stored-sample.ts";
import { type Cell as StoredCell, childRows, sampleRow } from "./sample-row.ts";

export type BulkEditTarget = { sample: Sample; issue?: ImportIssueCode };

type Targets = (
  numbers: number[],
) => Promise<ReadonlyMap<number, BulkEditTarget>>;

type ParsedSample = ParsedRows["samples"][number];

type Matched = { row: ParsedSample; sample: Sample };

const BULK_EDIT_SHEETS = [
  { name: SHEETS.samples, columns: EXPORT_SAMPLE_COLUMNS },
  ...EXPORT_CHILD_SHEETS,
];

const IDENTIFIER_HEADERS = new Set(
  EXPORT_SAMPLE_COLUMNS.filter(
    ({ path }) => path === "igsn" || path === "parents.igsn",
  ).map(plainHeader),
);

const NO_PARENTS = () => Promise.resolve(new Map<string, Sample>());

const isMandatory = (sheet: string, column: Column) =>
  column.header === SAMPLE_KEY_HEADER ||
  (sheet !== SHEETS.samples && column.path !== undefined);

const rowIssue = (
  { row }: ParsedSample,
  code: ImportIssueCode,
  column = SAMPLE_KEY_HEADER,
): ImportIssue => ({ sheet: SHEETS.samples, row, column, code });

const textOfCell = (value: StoredCell | undefined) =>
  value === null || value === undefined ? undefined : String(value);

const cellsOf = (columns: readonly Column[], values: readonly StoredCell[]) =>
  Object.fromEntries(
    columns.flatMap((column, index) => {
      const text = textOfCell(values[index]);
      return text === undefined ? [] : [[plainHeader(column), text]];
    }),
  );

async function matchRows(parsed: ParsedRows, targets: Targets) {
  const numbers = parsed.samples.map(internalNumberOf);
  const found = await targets([
    ...new Set(numbers.filter((number) => number !== undefined)),
  ]);
  const seen = new Set<number>();
  const issues: ImportIssue[] = [];
  const matched: Matched[] = [];
  for (const [index, row] of parsed.samples.entries()) {
    const number = numbers[index];
    const target = number === undefined ? undefined : found.get(number);
    if (row.cells[SAMPLE_KEY_HEADER] === undefined)
      issues.push(rowIssue(row, "missing_sample_key"));
    else if (number !== undefined && seen.has(number))
      issues.push(rowIssue(row, "duplicate_sample_key"));
    else if (target === undefined) issues.push(rowIssue(row, "unknown_sample"));
    else if (target.issue !== undefined)
      issues.push(rowIssue(row, target.issue));
    else matched.push({ row, sample: target.sample });
    if (number !== undefined) seen.add(number);
  }
  return { issues, matched };
}

function frozenIssues(
  { row, sample }: Matched,
  present: ReadonlySet<string>,
): ImportIssue[] {
  const stored = sampleRow(sample, EXPORT_SAMPLE_COLUMNS);
  return EXPORT_SAMPLE_COLUMNS.flatMap((column, index) => {
    const header = plainHeader(column);
    if (column.path === undefined || !present.has(header)) return [];
    if (!isFrozen(column, sample)) return [];
    const cell = row.cells[header];
    const text = cell === undefined ? undefined : textOf(cell);
    return text === textOfCell(stored[index])
      ? []
      : [rowIssue(row, "frozen_field", header)];
  });
}

function withStoredCells(
  { row, sample }: Matched,
  present: ReadonlySet<string>,
  presentSheets: ReadonlySet<string>,
): ParsedSample {
  const absent = EXPORT_SAMPLE_COLUMNS.filter(
    (column) => !present.has(plainHeader(column)),
  );
  const storedChildren = EXPORT_CHILD_SHEETS.filter(
    ({ name }) => !presentSheets.has(name),
  ).flatMap(({ name, columns }) =>
    childRows(sample, columns).map((values) => ({
      sheet: name,
      row: row.row,
      cells: cellsOf(columns, values),
    })),
  );
  const cells = { ...cellsOf(absent, sampleRow(sample, absent)), ...row.cells };
  return {
    ...row,
    cells: Object.fromEntries(
      Object.entries(cells).filter(
        ([header]) => !IDENTIFIER_HEADERS.has(header),
      ),
    ),
    children: [...row.children, ...storedChildren],
  };
}

async function validateMatched(
  parsed: ParsedRows,
  matched: readonly Matched[],
  layout: TemplateLayout,
) {
  const present = new Set(layout[0]?.columns.map(plainHeader));
  const presentSheets = new Set(layout.map(({ name }) => name));
  const frozen = matched.flatMap((match) => frozenIssues(match, present));
  const parentless = matched
    .filter(({ sample }) => sample.parents.length === 0)
    .flatMap(({ row }) => reportProcessStepsWithoutParent(row));
  const validated = await validateRows(
    {
      samples: matched.map((match) =>
        withStoredCells(match, present, presentSheets),
      ),
      orphans: parsed.orphans,
    },
    {},
    [],
    NO_PARENTS,
    new Set(),
    (candidate, index) => ({
      ...candidate,
      input: mergeStoredSample(matched[index]!.sample, candidate.input),
    }),
  );
  return {
    issues: [...frozen, ...parentless, ...validated.issues],
    samples: validated.samples.map(({ input }, index) => ({
      id: matched[index]!.sample.id,
      input,
      updatedAt: matched[index]!.sample.updatedAt,
    })),
  };
}

export function validateBulkEdit(
  bytes: ArrayBuffer,
  targets: Targets,
): Promise<{
  issues: ImportIssue[];
  samples: { id: string; input: CreateSample; updatedAt: Date }[];
}> {
  return queueBuild(async () => {
    const book = await openWorkbook(bytes);
    if (book === undefined) return rejected([{ code: "unreadable_file" }]);
    const { layout, issues } = templateLayout(
      book,
      BULK_EDIT_SHEETS,
      isMandatory,
    );
    if (issues.length > 0) return rejected(issues);
    const parsed = readRows(book, layout);
    if (parsed.samples.length === 0)
      return rejected([{ sheet: SHEETS.samples, code: "no_sample" }]);
    if (parsed.samples.length > MAX_IMPORT_ROWS)
      return rejected([{ sheet: SHEETS.samples, code: "too_many_rows" }]);
    const matching = await matchRows(parsed, targets);
    const validated = await validateMatched(parsed, matching.matched, layout);
    const found = [...matching.issues, ...validated.issues];
    return found.length > 0
      ? rejected(
          found.map((issue) => withValue(book, layout, issue)).sort(byPosition),
        )
      : { issues: [], samples: validated.samples };
  });
}
