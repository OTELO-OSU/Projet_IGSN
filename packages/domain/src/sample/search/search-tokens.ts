export function searchTokens(search: string): string[] {
  return search
    .trim()
    .split(/\s+/)
    .filter((token) => /[^*]/.test(token));
}

// ponytail: a cap on the pattern an untrusted query hands to the regex engines;
// past it the extra "*" is matched literally.
export const MAX_WILDCARDS = 2;

export const MAX_SEARCH_LENGTH = 200;

export type SearchToken = {
  segments: string[];
  anchorStart: boolean;
  anchorEnd: boolean;
};

export function parseSearchToken(token: string): SearchToken {
  const parts = token
    .split("*")
    .filter(
      (part, index, all) =>
        part !== "" || index === 0 || index === all.length - 1,
    );
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
