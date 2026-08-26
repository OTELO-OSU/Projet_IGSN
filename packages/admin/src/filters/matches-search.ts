const DIACRITICS = /\p{Diacritic}/gu;

export function normalizeSearch(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

export function matchesSearch(haystack: string, search: string): boolean {
  return normalizeSearch(haystack).includes(normalizeSearch(search));
}
