import type { SearchToken } from "@projet-igsn/domain/sample/search/search-tokens";

import {
  parseSearchToken,
  searchTokens,
} from "@projet-igsn/domain/sample/search/search-tokens";

const DIACRITICS = /\p{Diacritic}/gu;
const RUNS = /\S+/g;
const MAX_HIGHLIGHT_LENGTH = 300;

type Range = [number, number];

// So "Grès" matches "gres". Applied per character, so a match maps back onto
// the original text.
function normalize(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

function substringRanges(haystack: string, needle: string): Range[] {
  // An empty needle matches zero-width everywhere, and split() would return the
  // whole haystack character by character.
  if (needle === "") return [];

  // split() yields the gaps between occurrences, so an occurrence starts at the
  // previous one's end plus the gap before it. The trailing gap ends none.
  return haystack
    .split(needle)
    .slice(0, -1)
    .reduce<Range[]>((ranges, gap) => {
      const at = (ranges.at(-1)?.[1] ?? 0) + gap.length;
      return [...ranges, [at, at + needle.length]];
    }, []);
}

// Each segment as early as it can be after the previous one: a gap accepts any
// characters, so an earlier match never loses one a later match would find.
function chainSegments(
  run: string,
  segments: string[],
  from: number,
): number | undefined {
  return segments.reduce<number | undefined>((cursor, segment) => {
    const at = cursor === undefined ? -1 : run.indexOf(segment, cursor);
    return at === -1 ? undefined : at + segment.length;
  }, from);
}

// No RegExp: chained "\S*" backtrack, and the wildcard cap bounds the query, not
// the text.
function matchRun(
  run: string,
  { segments, anchorStart, anchorEnd }: SearchToken,
): Range | undefined {
  const head = segments[0] ?? "";
  const tail = segments.at(-1) ?? "";

  if (anchorStart && !run.startsWith(head)) return undefined;
  const start = anchorStart ? 0 : run.indexOf(head);
  if (start === -1) return undefined;

  // The tail anchors to the run's end, so it is matched apart from the chain.
  const cursor = chainSegments(
    run,
    segments.slice(1, anchorEnd ? -1 : undefined),
    start + head.length,
  );
  if (cursor === undefined) return undefined;

  if (anchorEnd) {
    return run.endsWith(tail) && run.length - tail.length >= cursor
      ? [start, run.length]
      : undefined;
  }
  // A trailing wildcard (an empty last segment) runs to the end of the word.
  return [start, tail === "" ? run.length : cursor];
}

// Offsets index the original `text`, to seed a DOM Range over the untouched
// node. No typo tolerance: a fuzzy-only match yields no range.
export function matchRanges(text: string, query: string): Range[] {
  const tokens = searchTokens(normalize(query));
  if (tokens.length === 0) {
    return [];
  }

  // ponytail: the mapping below walks every character and sample names have no
  // length limit; raise the cap if a real name is ever truncated.
  const searchable = text.slice(0, MAX_HIGHLIGHT_LENGTH);

  // For every normalized code point, the original character it came from (one
  // char normalizes to 0..n code points).
  const chars = Array.from({ length: searchable.length }, (_, i) =>
    Array.from(
      normalize(searchable[i] ?? ""),
      (codePoint) => [codePoint, i] as const,
    ),
  ).flat();
  const haystack = chars.map(([codePoint]) => codePoint).join("");
  const originalIndex = chars.map(([, i]) => i);

  // Overlapping ranges are fine for the CSS Custom Highlight API, so no merge.
  return tokens
    .flatMap<Range>((token) => {
      const parsed = parseSearchToken(token);
      // A wildcard never spans a space, so match run by run.
      const found: Range[] =
        parsed.segments.length === 1
          ? substringRanges(haystack, token)
          : [...haystack.matchAll(RUNS)].flatMap<Range>((run) => {
              const range = matchRun(run[0], parsed);
              return range
                ? [[run.index + range[0], run.index + range[1]]]
                : [];
            });
      return found.flatMap<Range>(([from, to]) => {
        const start = originalIndex[from];
        const last = originalIndex[to - 1];
        // A wildcard matches empty at every boundary; nothing to paint.
        return to === from || start === undefined || last === undefined
          ? []
          : [[start, last + 1]];
      });
    })
    .sort(([a], [b]) => a - b);
}
