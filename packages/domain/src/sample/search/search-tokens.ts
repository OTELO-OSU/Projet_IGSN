import { z } from "zod";

// ponytail: a search keeps its first 6 words of 2+ characters, bounding the ParadeDB regex arms an anonymous query builds; lift once pg_search bounds a regex's memory.
const MIN_TOKEN_LENGTH = 2;

const MAX_SEARCH_TOKENS = 6;

const graphemes = new Intl.Segmenter();

function literalLength(token: string): number {
  const literal = token
    .replaceAll("*", "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return Array.from(graphemes.segment(literal)).length;
}

export function searchTokens(search: string): string[] {
  const tokens = search
    .trim()
    .split(/\s+/)
    .filter((token) => literalLength(token) >= MIN_TOKEN_LENGTH);
  return [...new Set(tokens)].slice(0, MAX_SEARCH_TOKENS);
}

// ponytail: a cap on the pattern an untrusted query hands to the regex engines;
// past it the extra "*" is matched literally.
export const MAX_WILDCARDS = 2;

// ponytail: a cap under Tantivy's 1000-state regex limit; a longer token matches nothing.
export const MAX_TOKEN_LENGTH = 32;

export const MAX_SEARCH_LENGTH = 200;

export const MAX_SEARCH_TERM_LENGTH = 128;

export const truncatedTextSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.slice(0, MAX_SEARCH_LENGTH));

export const searchTermSchema = z
  .string()
  .trim()
  .transform((value) => value.slice(0, MAX_SEARCH_TERM_LENGTH))
  .optional()
  .catch(undefined);

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
