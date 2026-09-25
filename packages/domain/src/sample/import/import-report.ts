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
  "unknown_value",
  "parent_level_missing",
  "not_a_number",
  "not_a_date",
  "not_applicable",
  "duplicate_value",
]);
export type ImportIssueCode = z.infer<typeof importIssueCodeSchema>;

export const importIssueSchema = z.object({
  sheet: z.string(),
  row: z.number().int().optional(),
  column: z.string().optional(),
  code: z.string(),
  message: z.string().optional(),
});
export type ImportIssue = z.infer<typeof importIssueSchema>;

export const invalidImportSchema = z.object({
  error: z.literal("Invalid import"),
  issues: z.array(importIssueSchema),
});
export type InvalidImport = z.infer<typeof invalidImportSchema>;
