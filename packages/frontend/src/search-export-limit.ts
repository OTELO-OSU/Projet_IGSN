import {
  MAX_SEARCH_CSV_EXPORT_ROWS,
  MAX_SEARCH_XLSX_EXPORT_ROWS,
} from "@projet-igsn/domain/sample/search/max-search-export-rows";

export const SEARCH_CSV_EXPORT_LIMIT =
  Number(import.meta.env.VITE_SEARCH_CSV_EXPORT_LIMIT) ||
  MAX_SEARCH_CSV_EXPORT_ROWS;

export const SEARCH_XLSX_EXPORT_LIMIT =
  Number(import.meta.env.VITE_SEARCH_XLSX_EXPORT_LIMIT) ||
  MAX_SEARCH_XLSX_EXPORT_ROWS;
