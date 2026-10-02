import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";

import type { ParsedSample } from "./read-rows.ts";

import { SAMPLE_KEY_HEADER, SHEETS } from "./columns.ts";

export const reportProcessStepsWithoutParent = ({
  children,
}: ParsedSample): ImportIssue[] =>
  children
    .filter(({ sheet }) => sheet === SHEETS.processSteps)
    .map(({ sheet, row }) => ({
      sheet,
      row,
      column: SAMPLE_KEY_HEADER,
      code: "process_steps_without_parent",
    }));
