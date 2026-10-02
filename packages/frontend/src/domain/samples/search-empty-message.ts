import { searchTokens } from "@projet-igsn/domain/sample/search/search-tokens";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";

import { m } from "#/paraglide/messages.js";

export function searchEmptyMessage({ search, bbox }: SearchFilters): string {
  if (search && searchTokens(search).length === 0) {
    return m.search_too_short_hint();
  }
  return bbox && !search
    ? m.search_location_empty_hint()
    : m.search_no_results();
}
