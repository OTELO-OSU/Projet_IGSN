import { MAX_SEARCH_EXPORT_ROWS } from "@projet-igsn/domain/sample/search/max-search-export-rows";

export const SEARCH_EXPORT_LIMIT =
  Number(import.meta.env.VITE_SEARCH_EXPORT_LIMIT) || MAX_SEARCH_EXPORT_ROWS;
