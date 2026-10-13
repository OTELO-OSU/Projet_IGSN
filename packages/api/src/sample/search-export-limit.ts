import { MAX_SEARCH_EXPORT_ROWS } from "@projet-igsn/domain/sample/search/max-search-export-rows";
import { z } from "zod";

export const searchExportLimit: number = z.coerce
  .number()
  .int()
  .min(1)
  .catch(MAX_SEARCH_EXPORT_ROWS)
  .parse(process.env.SEARCH_EXPORT_LIMIT);
