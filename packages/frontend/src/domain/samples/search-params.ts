import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import {
  activeFacetKeys,
  facetQueryFields,
} from "@projet-igsn/domain/sample/search/facets";
import { MAX_SEARCH_LENGTH } from "@projet-igsn/domain/sample/search/search-tokens";
import { z } from "zod";

import type {
  ListSamplesParams,
  SampleFilters,
} from "#/domain/samples/client/list-samples.ts";
import type { SearchEngine } from "#/domain/samples/search-engine-tabs.tsx";

import { searchEngineSchema } from "#/domain/samples/search-engine-tabs.tsx";

export const PER_PAGE = 50;

// A param is present iff its engine is open, so "?q=" means open and unfilled.
// bbox ("west,south,east,north") stays raw; the domain schema validates it.
export const searchParamsSchema = z.object({
  // Same cap as listSamplesQuerySchema, and truncated the same way, so the URL,
  // the request and the highlighting all carry the same query.
  q: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_SEARCH_LENGTH))
    .optional()
    .catch(undefined),
  bbox: z.string().optional().catch(undefined),
  engine: searchEngineSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  ...facetQueryFields(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

function hasValidBbox(bbox: string | undefined): boolean {
  return !!bbox && bboxSchema.safeParse(bbox).success;
}

export function toFilters(params: SearchParams): SampleFilters {
  const filters: SampleFilters = {};
  const record = params as Record<string, string | number | undefined>;
  for (const key of activeFacetKeys(record)) filters[key] = record[key];
  return filters;
}

// Undefined when there is nothing to search, so the loader prefetch and the
// in-page query agree to skip it.
export function searchQueryParams(
  params: SearchParams,
): ListSamplesParams | undefined {
  const search = params.q || undefined;
  const bbox = hasValidBbox(params.bbox) ? params.bbox : undefined;
  const filters = toFilters(params);
  if (!search && !bbox && Object.keys(filters).length === 0) return undefined;
  return { page: params.page, perPage: PER_PAGE, search, bbox, filters };
}

// A malformed bbox is dropped, never handed to the map, which would draw it as a
// rectangle off the world.
export function composeSeedFromParams(params: SearchParams): {
  active: SearchEngine[];
  drafts: { q?: string; bbox?: string };
} {
  const active: SearchEngine[] = [];
  if (params.q !== undefined) active.push("text");
  if (params.bbox !== undefined) active.push("location");
  if (active.length === 0) active.push("text");
  // ponytail: two engines, so a reverse puts the URL's primary first; partition
  // on a third.
  if (params.engine && active.length > 1 && active[0] !== params.engine) {
    active.reverse();
  }
  return {
    active,
    drafts: {
      q: params.q,
      bbox: hasValidBbox(params.bbox) ? params.bbox : undefined,
    },
  };
}

export function isSearchActive(params: SearchParams): boolean {
  return !!params.q || hasValidBbox(params.bbox);
}
