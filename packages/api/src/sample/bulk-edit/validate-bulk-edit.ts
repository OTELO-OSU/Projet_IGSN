import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { canAddParent } from "@projet-igsn/domain/sample/parent/can-add-parent";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { publishBlockersOf } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { z } from "zod";

import type { ParsedRows } from "../import-template/read-rows.ts";
import type { TemplateLayout } from "../import-template/template-layout.ts";

import { queueBuild } from "../import-template/build-queue.ts";
import {
  CHILDREN_IGSNS_HEADER,
  type Column,
  PARENT_IGSN_HEADER,
  plainHeader,
  SAMPLE_COLUMNS,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "../import-template/columns.ts";
import { openWorkbook } from "../import-template/open-workbook.ts";
import { readRows, textOf } from "../import-template/read-rows.ts";
import { reportProcessStepsWithoutParent } from "../import-template/report-process-steps-without-parent.ts";
import { type SeriesChildCandidates } from "../import-template/resolve-import-children.ts";
import { igsnsInCell } from "../import-template/resolve-import-parents.ts";
import {
  INHERITED_PATHS,
  type ResolveParentsByIgsn,
} from "../import-template/resolve-import-parents.ts";
import { templateLayout } from "../import-template/template-layout.ts";
import {
  byPosition,
  internalNumberOf,
  rejected,
  validateRows,
  withValue,
} from "../import-template/validate-import.ts";
import { findCyclicParentLinks } from "../service/find-cyclic-parent-links.ts";
import { uploadLimit } from "../upload-limit.ts";
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

const IGSN_HEADERS = new Set(
  EXPORT_SAMPLE_COLUMNS.filter(({ path }) => path === "igsn").map(plainHeader),
);

const INHERITED_HEADERS = new Set(
  EXPORT_SAMPLE_COLUMNS.filter(({ path }) =>
    INHERITED_PATHS.some((inherited) => isPathAtOrUnder(path, inherited)),
  ).map(plainHeader),
);

const namesNewParent = ({ row, sample }: Matched) =>
  canAddParent(sample.parents) && row.cells[PARENT_IGSN_HEADER] !== undefined;

const isMandatory = (sheet: string, column: Column) =>
  column.header === SAMPLE_KEY_HEADER ||
  (sheet !== SHEETS.samples && column.path !== undefined);

const rowIssue = (
  { row }: ParsedSample,
  code: ImportIssueCode,
  column = SAMPLE_KEY_HEADER,
): ImportIssue => ({ sheet: SHEETS.samples, row, column, code });

const SAMPLE_TYPE_HEADER = plainHeader(
  SAMPLE_COLUMNS.find(({ path, level }) => path === "type" && level === 1)!,
);

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
  const inheriting = namesNewParent({ row, sample });
  const isDropped = (header: string) =>
    IGSN_HEADERS.has(header) ||
    (header === PARENT_IGSN_HEADER && !canAddParent(sample.parents)) ||
    (inheriting && INHERITED_HEADERS.has(header));
  return {
    ...row,
    cells: Object.fromEntries(
      Object.entries(cells).filter(([header]) => !isDropped(header)),
    ),
    children: [...row.children, ...storedChildren],
  };
}

async function cycleIssues(
  matched: readonly Matched[],
  addedParentIds: ReadonlyMap<number, readonly string[]>,
  listDescendantIds: SampleRepository["listDescendantIds"],
): Promise<ImportIssue[]> {
  const links = [...addedParentIds].map(([index, parentIds]) => ({
    index,
    childId: matched[index]!.sample.id,
    parentIds,
  }));
  const cyclic = findCyclicParentLinks(
    links,
    await listDescendantIds(links.map(({ childId }) => childId)),
  );
  return cyclic.map((at) =>
    rowIssue(
      matched[links[at]!.index]!.row,
      "parent_cycle",
      PARENT_IGSN_HEADER,
    ),
  );
}

async function validateMatched(
  parsed: ParsedRows,
  matched: readonly Matched[],
  layout: TemplateLayout,
  childCandidates: SeriesChildCandidates,
  resolveParents: ResolveParentsByIgsn,
  listDescendantIds: SampleRepository["listDescendantIds"],
) {
  const present = new Set(layout[0]?.columns.map(plainHeader));
  const presentSheets = new Set(layout.map(({ name }) => name));
  const frozen = matched.flatMap((match) => frozenIssues(match, present));
  const parentless = matched
    .filter(
      (match) => match.sample.parents.length === 0 && !namesNewParent(match),
    )
    .flatMap(({ row }) => reportProcessStepsWithoutParent(row));
  const rows = matched.map((match) =>
    withStoredCells(match, present, presentSheets),
  );
  const addedParentIds = new Map<number, readonly string[]>();
  const validated = await validateRows(
    { samples: rows, orphans: parsed.orphans },
    {},
    [],
    resolveParents,
    new Set(),
    (candidate, index) => {
      const { sample } = matched[index]!;
      const parentIds = z
        .array(z.string())
        .safeParse(candidate.input.parentIds);
      if (parentIds.success) addedParentIds.set(index, parentIds.data);
      return {
        ...candidate,
        input: mergeStoredSample(sample, candidate.input),
        existingBlockers: publishBlockersOf(
          sample,
          uploadLimit,
          sample.parents,
        ),
      };
    },
    {
      ...childCandidates,
      of: (index) => ({
        igsns: igsnsInCell(rows[index]!.cells[CHILDREN_IGSNS_HEADER]),
        series: matched[index]!.sample,
      }),
    },
  );
  const isEveryRowValid = validated.samples.length === matched.length;
  const seriesInLineage = isEveryRowValid
    ? validated.samples.flatMap(({ input }, index) => {
        const { row, sample } = matched[index]!;
        return isVirtualSample(input.type) &&
          (!canBecomeSeries(sample) || (input.parentIds?.length ?? 0) > 0)
          ? [rowIssue(row, "series_in_lineage", SAMPLE_TYPE_HEADER)]
          : [];
      })
    : [];
  const cycles = await cycleIssues(matched, addedParentIds, listDescendantIds);
  return {
    issues: [
      ...frozen,
      ...parentless,
      ...seriesInLineage,
      ...cycles,
      ...validated.issues,
    ],
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
  childCandidates: SeriesChildCandidates,
  resolveParents: ResolveParentsByIgsn,
  listDescendantIds: SampleRepository["listDescendantIds"],
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
    const validated = await validateMatched(
      parsed,
      matching.matched,
      layout,
      childCandidates,
      resolveParents,
      listDescendantIds,
    );
    const found = [...matching.issues, ...validated.issues];
    return found.length > 0
      ? rejected(
          found.map((issue) => withValue(book, layout, issue)).sort(byPosition),
        )
      : { issues: [], samples: validated.samples };
  });
}
