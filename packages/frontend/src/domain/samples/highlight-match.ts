import type { SearchToken } from "@projet-igsn/domain/sample/search/search-tokens";

import {
  parseSearchToken,
  searchTokens,
} from "@projet-igsn/domain/sample/search/search-tokens";

const DIACRITICS = /\p{Diacritic}/gu;
const RUNS = /\S+/g;
const MAX_HIGHLIGHT_LENGTH = 300;

type Range = [number, number];

function normalize(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

function substringRanges(haystack: string, needle: string): Range[] {
  if (needle === "") return [];

  return haystack
    .split(needle)
    .slice(0, -1)
    .reduce<Range[]>((ranges, gap) => {
      const at = (ranges.at(-1)?.[1] ?? 0) + gap.length;
      return [...ranges, [at, at + needle.length]];
    }, []);
}

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

export function exactRanges(text: string, query: string): Range[] {
  return searchTokens(normalize(query)).includes(normalize(text))
    ? [[0, text.length]]
    : [];
}

function matchRun(
  run: string,
  { segments, anchorStart, anchorEnd }: SearchToken,
): Range | undefined {
  const head = segments[0] ?? "";
  const tail = segments.at(-1) ?? "";

  if (anchorStart && !run.startsWith(head)) return undefined;
  const start = anchorStart ? 0 : run.indexOf(head);
  if (start === -1) return undefined;

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
  return [start, tail === "" ? run.length : cursor];
}

export function matchRanges(text: string, query: string): Range[] {
  const tokens = searchTokens(normalize(query));
  if (tokens.length === 0) {
    return [];
  }

  // ponytail: the mapping below walks every character; raise the cap if a real
  // name is ever truncated.
  const searchable = text.slice(0, MAX_HIGHLIGHT_LENGTH);

  const chars = Array.from({ length: searchable.length }, (_, i) =>
    Array.from(
      normalize(searchable[i] ?? ""),
      (codePoint) => [codePoint, i] as const,
    ),
  ).flat();
  const haystack = chars.map(([codePoint]) => codePoint).join("");
  const originalIndex = chars.map(([, i]) => i);

  return tokens
    .flatMap<Range>((token) => {
      const parsed = parseSearchToken(token);
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
        return to === from || start === undefined || last === undefined
          ? []
          : [[start, last + 1]];
      });
    })
    .sort(([a], [b]) => a - b);
}
