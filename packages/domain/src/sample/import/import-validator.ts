import { z } from "zod";

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
