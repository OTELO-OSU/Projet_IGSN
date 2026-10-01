import { z } from "zod";

export const importIssueCodeSchema = z.enum([
  "unreadable_file",
  "missing_sheet",
  "missing_column",
  "duplicate_column",
  "no_sample",
  "too_many_rows",
  "missing_sample_key",
  "duplicate_sample_key",
  "unknown_sample_key",
  "not_applicable",
  "duplicate_value",
  "unavailable_internal_id",
  "unknown_manual_group",
  "multiple_parent_igsns",
  "location_inherited_from_parent",
  "collection_date_inherited_from_parent",
]);
export type ImportIssueCode = z.infer<typeof importIssueCodeSchema>;

export const importIssueSchema = z.object({
  sheet: z.string().optional(),
  row: z.number().int().optional(),
  column: z.string().optional(),
  value: z.string().optional(),
  code: z.string(),
  message: z.string().optional(),
});
export type ImportIssue = z.infer<typeof importIssueSchema>;

export const invalidImportSchema = z.object({
  error: z.literal("Invalid import"),
  issues: z.array(importIssueSchema),
});
export type InvalidImport = z.infer<typeof invalidImportSchema>;

export const importAcceptedSchema = z.object({ count: z.number().int() });
export type ImportAccepted = z.infer<typeof importAcceptedSchema>;
