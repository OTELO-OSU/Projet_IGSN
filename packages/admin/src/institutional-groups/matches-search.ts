const DIACRITICS = /\p{Diacritic}/gu;

function normalize(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

export function matchesSearch(haystack: string, search: string): boolean {
  return normalize(haystack).includes(normalize(search));
}
