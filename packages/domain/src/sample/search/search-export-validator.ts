import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { MAX_SEARCH_CSV_EXPORT_ROWS } from "./max-search-export-rows.ts";

export const searchExportFormatSchema = z.enum(["csv", "xlsx"]);

export type SearchExportFormat = z.infer<typeof searchExportFormatSchema>;

export const searchSelectionExportSchema = z.strictObject({
  format: searchExportFormatSchema.default("csv"),
  igsns: z.array(igsnSchema).min(1).max(MAX_SEARCH_CSV_EXPORT_ROWS),
});

export type SearchSelectionExport = z.infer<typeof searchSelectionExportSchema>;
