import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { ImportedSample } from "@projet-igsn/domain/sample/repository";
import type ExcelJS from "exceljs";

import { formatDate } from "@projet-igsn/domain/date/format-date";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { parseInternalId } from "@projet-igsn/domain/sample/parse-internal-id";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";

import type { TemplateLayout } from "./template-layout.ts";

import { queueBuild } from "./build-queue.ts";
import {
  buildSampleInputs,
  type SampleCandidate,
} from "./build-sample-inputs.ts";
import {
  DATA_SHEETS,
  PARENT_IGSN_HEADER,
  plainHeader,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";
import { prefilledHeaderLabelsOf, readCustomization } from "./customization.ts";
import { openWorkbook } from "./open-workbook.ts";
import {
  cellValue,
  type ParsedRows,
  type RawRow,
  readRows,
  textOf,
} from "./read-rows.ts";
import { reportProcessStepsWithoutParent } from "./report-process-steps-without-parent.ts";
import { IMPORT_DEFAULTS } from "./required-columns.ts";
import {
  INHERITED_PATHS,
  type ResolveParentsByIgsn,
  resolveImportParents,
} from "./resolve-import-parents.ts";
import { templateLayout } from "./template-layout.ts";
import {
  type AttachmentMetadata,
  validateSamples,
} from "./validate-samples.ts";

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

export function withValue(
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

export function byPosition(a: ImportIssue, b: ImportIssue): number {
  const [p, q] = [positionOf(a), positionOf(b)];
  return p[0] - q[0] || p[1] - q[1] || p[2] - q[2];
}

type ValidatedImport = {
  issues: ImportIssue[];
  samples: (Omit<ImportedSample, "attachments"> & {
    attachments: AttachmentMetadata[];
  })[];
};

export const rejected = (
  issues: ImportIssue[],
): { issues: ImportIssue[]; samples: [] } => ({ issues, samples: [] });

export const internalNumberOf = ({ cells }: RawRow) => {
  const key = cells[SAMPLE_KEY_HEADER];
  return key === undefined ? undefined : parseInternalId(textOf(key));
};

const isInheritedField = ({ sheet, column }: ImportIssue) =>
  INHERITED_PATHS.some((path) =>
    isPathAtOrUnder(templateColumnOf(sheet, column)?.column.path, path),
  );

const absentDefaultsOf = (layout: TemplateLayout) => {
  const present = new Set(
    layout
      .find(({ name }) => name === SHEETS.samples)
      ?.columns.map(({ path }) => path),
  );
  return Object.fromEntries(
    Object.entries(IMPORT_DEFAULTS).filter(([path]) => !present.has(path)),
  );
};

export async function validateRows(
  parsed: ParsedRows,
  defaults: Readonly<Record<string, string>>,
  manualGroups: readonly ManualGroup[],
  resolveParentsByIgsn: ResolveParentsByIgsn,
  providedFileNames: ReadonlySet<string>,
  prepare: (candidate: SampleCandidate, index: number) => SampleCandidate = (
    candidate,
  ) => candidate,
): Promise<ValidatedImport> {
  const built = buildSampleInputs(parsed, manualGroups);
  const parents = await resolveImportParents(
    built.samples.map((sample) => ({
      ...sample,
      input: { ...defaults, ...sample.input },
    })),
    resolveParentsByIgsn,
  );
  const reported = new Set([...built.issues, ...parents.issues].map(fieldOf));
  const unresolved = new Set(parents.issues.map(({ row }) => row));
  const { issues, samples } = validateSamples(
    parents.samples.map(prepare),
    providedFileNames,
  );
  return {
    issues: [
      ...built.issues,
      ...parents.issues,
      ...issues.filter(
        (issue) =>
          !reported.has(fieldOf(issue)) &&
          !(unresolved.has(issue.row) && isInheritedField(issue)),
      ),
    ],
    samples: samples.map((sample, index) => ({
      ...sample,
      internalNumber: internalNumberOf(parsed.samples[index]!) ?? null,
    })),
  };
}

export function withoutPrefilledRows(
  parsed: ReturnType<typeof readRows>,
  prefilled: ReadonlyMap<string, string>,
): ReturnType<typeof readRows> {
  const isPrefilled = ({ cells }: RawRow) =>
    Object.entries(cells).every(
      ([header, cell]) =>
        header === SAMPLE_KEY_HEADER || prefilled.get(header) === textOf(cell),
    );
  return {
    samples: parsed.samples.filter((sample) => !isPrefilled(sample)),
    orphans: [
      ...parsed.orphans,
      ...parsed.samples.filter(isPrefilled).flatMap(({ children }) => children),
    ],
  };
}

type UnavailableInternalNumbers = (numbers: number[]) => Promise<Set<number>>;

type AttachableManualGroups = () => Promise<readonly ManualGroup[]>;

async function internalIdIssues(
  parsed: ParsedRows,
  unavailableInternalNumbers: UnavailableInternalNumbers,
): Promise<ImportIssue[]> {
  const keyed = parsed.samples.flatMap((sample) => {
    const internalNumber = internalNumberOf(sample);
    return internalNumber === undefined
      ? []
      : [{ row: sample.row, internalNumber }];
  });
  const unavailable = await unavailableInternalNumbers([
    ...new Set(keyed.map(({ internalNumber }) => internalNumber)),
  ]);
  return keyed.flatMap(({ row, internalNumber }): ImportIssue[] =>
    unavailable.has(internalNumber)
      ? [
          {
            sheet: SHEETS.samples,
            row,
            column: SAMPLE_KEY_HEADER,
            code: "unavailable_internal_id",
          },
        ]
      : [],
  );
}

type ParsedImport =
  | { issues: ImportIssue[] }
  | { book: ExcelJS.Workbook; layout: TemplateLayout; parsed: ParsedRows };

export async function parseImport(bytes: ArrayBuffer): Promise<ParsedImport> {
  const book = await openWorkbook(bytes);
  if (book === undefined) return { issues: [{ code: "unreadable_file" }] };
  const { layout, issues } = templateLayout(book);
  if (issues.length > 0) return { issues };
  const parsed = withoutPrefilledRows(
    readRows(book, layout),
    prefilledHeaderLabelsOf(readCustomization(book)),
  );
  if (parsed.samples.length === 0)
    return { issues: [{ sheet: SHEETS.samples, code: "no_sample" }] };
  if (parsed.samples.length > MAX_IMPORT_ROWS)
    return { issues: [{ sheet: SHEETS.samples, code: "too_many_rows" }] };
  return { book, layout, parsed };
}

export function validateImport(
  bytes: ArrayBuffer,
  providedFileNames: ReadonlySet<string>,
  unavailableInternalNumbers: UnavailableInternalNumbers,
  attachableManualGroups: AttachableManualGroups,
  resolveParentsByIgsn: ResolveParentsByIgsn,
): Promise<ValidatedImport> {
  return queueBuild(async () => {
    const opened = await parseImport(bytes);
    if ("issues" in opened) return rejected(opened.issues);
    const { book, layout, parsed } = opened;
    const validated = await validateRows(
      parsed,
      absentDefaultsOf(layout),
      await attachableManualGroups(),
      resolveParentsByIgsn,
      providedFileNames,
    );
    return {
      issues: [
        ...validated.issues,
        ...(await internalIdIssues(parsed, unavailableInternalNumbers)),
        ...parsed.samples
          .filter(({ cells }) => cells[PARENT_IGSN_HEADER] === undefined)
          .flatMap(reportProcessStepsWithoutParent),
      ]
        .map((issue) => withValue(book, layout, issue))
        .sort(byPosition),
      samples: validated.samples,
    };
  });
}
