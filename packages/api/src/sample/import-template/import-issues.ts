import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";

import { queueBuild } from "./build-queue.ts";
import { openWorkbook } from "./open-workbook.ts";
import { readRows } from "./read-rows.ts";
import { sampleIssues } from "./sample-issues.ts";
import { templateLayout } from "./template-layout.ts";

export function importIssues(bytes: ArrayBuffer): Promise<ImportIssue[]> {
  return queueBuild(async () => {
    const book = await openWorkbook(bytes);
    if (book === undefined) return [{ sheet: "", code: "unreadable_file" }];
    const { layout, issues } = templateLayout(book);
    if (issues.length > 0) return issues;
    const read = readRows(book, layout);
    return read.issues.length > 0 ? read.issues : sampleIssues(read.samples);
  });
}
