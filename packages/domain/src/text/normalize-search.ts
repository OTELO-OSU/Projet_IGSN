const DIACRITICS = /\p{Diacritic}/gu;

export function normalizeSearch(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}
