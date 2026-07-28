// Shared by the API filter and the frontend highlighting, so the two cannot
// drift. Grammar in ADR 0018.
export function searchTokens(search: string): string[] {
  // A token of nothing but wildcards matches every sample, so it carries no
  // intent: dropped, which leaves a query of only "*" with no token at all.
  return search
    .trim()
    .split(/\s+/)
    .filter((token) => /[^*]/.test(token));
}

// ponytail: a cap on the pattern an untrusted query hands to the regex engines;
// past it the extra "*" is matched literally.
export const MAX_WILDCARDS = 2;

// Truncated past this, never dropped: dropping it would mean no filter.
export const MAX_SEARCH_LENGTH = 200;

// A token split around its "*". A wildcard anchors a word boundary on its
// starless side ("bas*" starts a word); a starless token stays a substring.
export type SearchToken = {
  segments: string[];
  anchorStart: boolean;
  anchorEnd: boolean;
};

export function parseSearchToken(token: string): SearchToken {
  // Adjacent wildcards would join into "\S*\S*", which backtracks in the JS
  // highlighter. Outer blanks stay: they carry the anchoring.
  const parts = token
    .split("*")
    .filter(
      (part, index, all) =>
        part !== "" || index === 0 || index === all.length - 1,
    );
  // A leading or trailing "*" is an anchor, so it must not spend the cap.
  const head = parts[0] === "" ? [""] : [];
  const tail = parts.length > 1 && parts.at(-1) === "" ? [""] : [];
  const interior = parts.slice(head.length, parts.length - tail.length);
  const segments = [
    ...head,
    ...(interior.length > MAX_WILDCARDS + 1
      ? [
          ...interior.slice(0, MAX_WILDCARDS),
          interior.slice(MAX_WILDCARDS).join("*"),
        ]
      : interior),
    ...tail,
  ];
  const hasWildcard = segments.length > 1;
  return {
    segments,
    anchorStart: hasWildcard && segments[0] !== "",
    anchorEnd: hasWildcard && segments.at(-1) !== "",
  };
}
