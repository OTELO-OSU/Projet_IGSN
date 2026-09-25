import {
  type ImportIssue,
  type ImportIssueCode,
  importIssueCodeSchema,
} from "@projet-igsn/domain/sample/import/import-report";
import { publishBlockerSchema } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { m } from "#/paraglide/messages.js";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";

const IMPORT_ISSUE_LABELS: Record<ImportIssueCode, () => string> = {
  unreadable_file: m.import_issue_unreadable_file,
  missing_sheet: m.import_issue_missing_sheet,
  missing_column: m.import_issue_missing_column,
  duplicate_column: m.import_issue_duplicate_column,
  no_sample: m.import_issue_no_sample,
  too_many_rows: m.import_issue_too_many_rows,
  missing_sample_key: m.import_issue_missing_sample_key,
  duplicate_sample_key: m.import_issue_duplicate_sample_key,
  unknown_sample_key: m.import_issue_unknown_sample_key,
  unknown_value: m.import_issue_unknown_value,
  parent_level_missing: m.import_issue_parent_level_missing,
  not_a_number: m.import_issue_not_a_number,
  not_a_date: m.import_issue_not_a_date,
  not_applicable: m.import_issue_not_applicable,
  duplicate_value: m.import_issue_duplicate_value,
};

export function importIssueLabel({ code, message }: ImportIssue): string {
  const importCode = importIssueCodeSchema.safeParse(code);
  if (importCode.success) return IMPORT_ISSUE_LABELS[importCode.data]();
  const blocker = publishBlockerSchema.safeParse(code);
  if (blocker.success) return publishBlockerLabel(blocker.data);
  return message ?? m.import_report_invalid_value();
}
