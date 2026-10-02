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
  not_applicable: m.import_issue_not_applicable,
  duplicate_value: m.import_issue_duplicate_value,
  unavailable_internal_id: m.import_issue_unavailable_internal_id,
  unknown_manual_group: m.import_issue_unknown_manual_group,
  multiple_parent_igsns: m.import_issue_multiple_parent_igsns,
  location_inherited_from_parent: m.import_issue_location_inherited_from_parent,
  collection_date_inherited_from_parent:
    m.import_issue_collection_date_inherited_from_parent,
  process_steps_without_parent: m.import_issue_process_steps_without_parent,
  unknown_sample: m.import_issue_unknown_sample,
  sample_not_published: m.import_issue_sample_not_published,
  synthetic_sample: m.import_issue_synthetic_sample,
  sample_not_editable: m.import_issue_sample_not_editable,
  sample_locked: m.import_issue_sample_locked,
  frozen_field: m.import_issue_frozen_field,
  missing_attachment_file: m.import_issue_missing_attachment_file,
};

export function importIssueLabel({ code, message }: ImportIssue): string {
  const importCode = importIssueCodeSchema.safeParse(code);
  if (importCode.success) return IMPORT_ISSUE_LABELS[importCode.data]();
  const blocker = publishBlockerSchema.safeParse(code);
  if (blocker.success) return publishBlockerLabel(blocker.data);
  return message ?? m.import_report_invalid_value();
}
