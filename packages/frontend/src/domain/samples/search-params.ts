import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { z } from "zod";

import type { ListSamplesParams } from "#/domain/samples/client/list-samples.ts";
import type { SearchEngine } from "#/domain/samples/search-engine-tabs.tsx";

// Fixed page size; not a URL param.
export const PER_PAGE = 50;

// Frontend-only URL state. `engine` picks the search mode; the text engine uses
// `q`, the location engine uses `bbox` ("west,south,east,north"). bbox stays a
// raw string here; the domain schema validates it where it matters (prefetch
// decision, request).
export const searchParamsSchema = z.object({
  engine: z.enum(["text", "location"]).default("text").catch("text"),
  q: z.string().trim().min(1).optional().catch(undefined),
  bbox: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// The list query for the active engine, or undefined when there is nothing to
// search (empty text, or location without a valid box). Drives both the loader
// prefetch and the in-page query, so they always agree.
export function searchQueryParams(
  params: SearchParams,
): ListSamplesParams | undefined {
  if (params.engine === "location") {
    if (!params.bbox || !bboxSchema.safeParse(params.bbox).success) {
      return undefined;
    }
    return { page: params.page, perPage: PER_PAGE, bbox: params.bbox };
  }
  if (!params.q) return undefined;
  return { page: params.page, perPage: PER_PAGE, search: params.q };
}

// Switching engine resets to page 1 and drops the other engine's param, so a
// shared URL never carries a stale filter for the hidden engine.
export function nextEngineSearch(
  params: SearchParams,
  engine: SearchEngine,
): SearchParams {
  if (engine === "location") {
    return { engine, bbox: params.bbox, page: 1 };
  }
  return { engine, q: params.q, page: 1 };
}

// The URL state for a location search on the drawn box, always page 1.
export function locationSearch(bbox: string): SearchParams {
  return { engine: "location", bbox, page: 1 };
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
