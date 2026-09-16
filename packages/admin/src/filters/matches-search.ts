import { normalizeSearch } from "@projet-igsn/domain/text/normalize-search";

export function matchesSearch(haystack: string, search: string): boolean {
  return normalizeSearch(haystack).includes(normalizeSearch(search));
}
