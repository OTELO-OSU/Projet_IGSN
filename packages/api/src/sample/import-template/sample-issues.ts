import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { z } from "zod";

import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { publishedSampleSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";

import type { Column } from "./columns.ts";
import type { SampleCandidate } from "./read-rows.ts";

import { DATA_SHEETS, plainHeader, SHEETS } from "./columns.ts";

type SheetColumn = { sheet: string; column: Column };

const COLUMNS: readonly SheetColumn[] = DATA_SHEETS.flatMap((sheet) =>
  sheet.columns.map((column) => ({ sheet: sheet.name, column })),
);

const prefixesOf = (keys: readonly string[]) =>
  keys.map((_, index) => keys.slice(0, keys.length - index).join("."));

function columnAt(
  columns: readonly SheetColumn[],
  path: readonly string[],
): SheetColumn | undefined {
  for (const prefix of prefixesOf(path)) {
    const found = columns.find(({ column }) =>
      isPathAtOrUnder(column.path, prefix),
    );
    if (found !== undefined) return found;
  }
  return undefined;
}

function issueOf(
  sample: SampleCandidate,
  { path, code, message, ...issue }: z.core.$ZodIssue,
): ImportIssue {
  const keys = path.map(String);
  const source = prefixesOf(keys)
    .map((prefix) => sample.rowsByPath[prefix])
    .find((candidate) => candidate !== undefined);
  const found = columnAt(
    source === undefined
      ? COLUMNS
      : COLUMNS.filter(({ sheet }) => sheet === source.sheet),
    path.filter((key) => typeof key === "string"),
  );
  const place =
    source ??
    (found?.column.path === undefined
      ? undefined
      : sample.rowsByPath[found.column.path]) ??
    (found === undefined || found.sheet === SHEETS.samples
      ? { sheet: SHEETS.samples, row: sample.row }
      : { sheet: found.sheet });
  const blocker =
    "params" in issue && typeof issue.params?.code === "string"
      ? issue.params.code
      : undefined;
  return {
    ...place,
    ...(found === undefined ? {} : { column: plainHeader(found.column) }),
    ...(blocker === undefined ? { code, message } : { code: blocker }),
  };
}

export function sampleIssues(
  samples: readonly SampleCandidate[],
): ImportIssue[] {
  return samples.flatMap((sample) => {
    const parsed = publishedSampleSchema.safeParse(sample.input);
    return parsed.success
      ? []
      : parsed.error.issues.map((issue) => issueOf(sample, issue));
  });
}
