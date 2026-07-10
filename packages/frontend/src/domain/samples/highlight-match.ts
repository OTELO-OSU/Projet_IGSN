const DIACRITICS = /\p{Diacritic}/gu;

// Lowercase and strip accents so "Grès" matches "gres". Applied per character so
// matches can be mapped back onto the original, accented text.
function normalize(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

// Character offsets [start, end) in `text` of every run matching `query`,
// compared case- and accent-insensitively. Offsets index the original text, so
// they can seed a DOM Range over the untouched text node.
export function matchRanges(text: string, query: string): [number, number][] {
  const needle = normalize(query).trim();
  if (!needle) {
    return [];
  }

  // Normalized haystack plus, for every normalized code point, the index of the
  // original character it came from (a char can normalize to 0..n code points).
  const chars = Array.from({ length: text.length }, (_, i) =>
    [...normalize(text[i] ?? "")].map((codePoint) => [codePoint, i] as const),
  ).flat();
  const haystack = chars.map(([codePoint]) => codePoint).join("");
  const originalIndex = chars.map(([, i]) => i);

  // matchAll advances by the full match length, so runs are non-overlapping and
  // left-to-right, as the manual indexOf scan was. Escape the needle since it
  // comes from user input.
  const pattern = new RegExp(
    needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "g",
  );
  return [...haystack.matchAll(pattern)].flatMap((match) => {
    const start = originalIndex[match.index];
    const last = originalIndex[match.index + needle.length - 1];
    return start === undefined || last === undefined ? [] : [[start, last + 1]];
  });
}
