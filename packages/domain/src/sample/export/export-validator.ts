import { z } from "zod";

import { MAX_IMPORT_ROWS } from "../import/max-import-rows.ts";
import { listSamplesQuerySchema } from "../sample-validator.ts";

export const exportSamplesRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("ids"),
    moderated: z.boolean(),
    ids: z.array(z.uuid()).min(1).max(MAX_IMPORT_ROWS),
  }),
  z.object({
    mode: z.literal("filters"),
    moderated: z.boolean(),
    query: listSamplesQuerySchema.omit({
      page: true,
      perPage: true,
      sort: true,
      order: true,
    }),
  }),
]);

export type ExportSamplesRequest = z.infer<typeof exportSamplesRequestSchema>;
