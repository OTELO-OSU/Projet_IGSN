import { z } from "zod";

import { parseInternalId } from "../parse-internal-id.ts";
import { MAX_IMPORT_ROWS } from "./max-import-rows.ts";

export const XLSX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const IMPORT_TEMPLATE_FILENAME = "igsn-sample-import-template.xlsx";

export const IMPORT_MAX_BYTES = 20 * 1024 * 1024;

export const importSamplesSchema = z.strictObject({
  file: z
    .file()
    .max(IMPORT_MAX_BYTES)
    .mime(XLSX_MEDIA_TYPE)
    .refine((file) => file.name.toLowerCase().endsWith(".xlsx")),
});

export type ImportSamples = z.infer<typeof importSamplesSchema>;

export const reserveInternalIdsSchema = z.strictObject({
  count: z.int().min(1).max(MAX_IMPORT_ROWS),
});

export type ReserveInternalIds = z.infer<typeof reserveInternalIdsSchema>;

export const internalIdRequestSchema = z.strictObject({
  internalIds: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .refine((text) => parseInternalId(text) !== undefined),
    )
    .min(1)
    .max(MAX_IMPORT_ROWS),
});

export type InternalIdRequest = z.infer<typeof internalIdRequestSchema>;
