import type { SearchExportFormat } from "@projet-igsn/domain/sample/search/search-export-validator";

import {
  MAX_SEARCH_CSV_EXPORT_ROWS,
  MAX_SEARCH_XLSX_EXPORT_ROWS,
} from "@projet-igsn/domain/sample/search/max-search-export-rows";
import { z } from "zod";

const limitOf = (value: string | undefined, fallback: number): number =>
  z.coerce.number().int().min(1).catch(fallback).parse(value);

export const searchExportLimits: Record<SearchExportFormat, number> = {
  csv: limitOf(process.env.SEARCH_CSV_EXPORT_LIMIT, MAX_SEARCH_CSV_EXPORT_ROWS),
  xlsx: limitOf(
    process.env.SEARCH_XLSX_EXPORT_LIMIT,
    MAX_SEARCH_XLSX_EXPORT_ROWS,
  ),
};
