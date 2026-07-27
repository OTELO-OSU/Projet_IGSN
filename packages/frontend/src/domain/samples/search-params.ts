import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import {
  activeFacetKeys,
  facetQueryFields,
} from "@projet-igsn/domain/sample/search/facets";
import { z } from "zod";

import type {
  ListSamplesParams,
  SampleFilters,
} from "#/domain/samples/client/list-samples.ts";
import type { SearchEngine } from "#/domain/samples/search-engine-tabs.tsx";

// Fixed page size; not a URL param.
export const PER_PAGE = 50;

// Frontend-only URL state. `engine` picks the search mode; the text engine uses
// `q` plus one param per facet (from the registry, so the URL schema matches the
// API), the location engine uses `bbox` ("west,south,east,north"). bbox stays a
// raw string here; the domain schema validates it where it matters (prefetch
// decision, request).
export const searchParamsSchema = z.object({
  engine: z.enum(["text", "location"]).default("text").catch("text"),
  q: z.string().trim().min(1).optional().catch(undefined),
  bbox: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  ...facetQueryFields(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// The facet params as an API filter bag: every active facet param, keyed by
// name. A range unit alone (no bound) is not active, so it is never sent.
export function toFilters(params: SearchParams): SampleFilters {
  const filters: SampleFilters = {};
  const record = params as Record<string, string | number | undefined>;
  for (const key of activeFacetKeys(record)) filters[key] = record[key];
  return filters;
}

// Text results (and the facet sidebar) show once there is a text query or any
// facet.
export function hasActiveFilters(params: SearchParams): boolean {
  return Boolean(params.q) || activeFacetKeys(params).length > 0;
}

// The list query for the active engine, or undefined when there is nothing to
// search (empty text with no facet, or location without a valid box). Drives
// both the loader prefetch and the in-page query, so they always agree.
export function searchQueryParams(
  params: SearchParams,
): ListSamplesParams | undefined {
  if (params.engine === "location") {
    if (!params.bbox || !bboxSchema.safeParse(params.bbox).success) {
      return undefined;
    }
    return {
      page: params.page,
      perPage: PER_PAGE,
      bbox: params.bbox,
      filters: toFilters(params),
    };
  }
  if (!hasActiveFilters(params)) return undefined;
  return {
    page: params.page,
    perPage: PER_PAGE,
    search: params.q,
    filters: toFilters(params),
  };
}

// Switching engine resets to page 1 and drops the other engine's own param (`q`
// or `bbox`), so a shared URL never searches on a term the hidden engine set.
// Facets survive the round trip: a mistaken tab click must not silently discard
// the sidebar the reader just filled in.
export function nextEngineSearch(
  params: SearchParams,
  engine: SearchEngine,
): SearchParams {
  return engine === "location"
    ? { ...params, engine, q: undefined, page: 1 }
    : { ...params, engine, bbox: undefined, page: 1 };
}

// The URL state for a location search on the drawn box, always page 1. Facets
// carry over from `params` (the sidebar refines a box search too); the text
// query does not, it belongs to the other engine. Called without params from the
// landing page, where there is nothing to carry.
export function locationSearch(
  bbox: string,
  params?: SearchParams,
): SearchParams {
  return { ...params, engine: "location", bbox, q: undefined, page: 1 };
}

// A location search has run once the location engine holds a valid box; the
// banner shrink derives from this so it survives a refresh (URL-derived).
export function isLocationSearchActive(params: SearchParams): boolean {
  return (
    params.engine === "location" &&
    !!params.bbox &&
    bboxSchema.safeParse(params.bbox).success
  );
}
