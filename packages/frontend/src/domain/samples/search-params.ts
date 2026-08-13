import {
  bboxSchema,
  pageSizeSchema,
} from "@projet-igsn/domain/sample/sample-validator";
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

export const PER_PAGE = 10;

export const searchParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_SEARCH_LENGTH))
    .optional()
    .catch(undefined),
  bbox: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: pageSizeSchema(PER_PAGE).optional(),
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

export function searchQueryParams(
  params: SearchParams,
): ListSamplesParams | undefined {
  const search = params.q || undefined;
  const bbox = hasValidBbox(params.bbox) ? params.bbox : undefined;
  const filters = toFilters(params);
  if (!search && !bbox && Object.keys(filters).length === 0) return undefined;
  return {
    page: params.page,
    perPage: params.perPage ?? PER_PAGE,
    search,
    bbox,
    filters,
  };
}

export function composeSeedFromParams(params: SearchParams): {
  active: SearchEngine[];
  drafts: { q?: string; bbox?: string };
} {
  const active: SearchEngine[] = [];
  if (params.q !== undefined) active.push("text");
  if (params.bbox !== undefined) active.push("location");
  if (active.length === 0) active.push("text");
  return {
    active,
    drafts: {
      q: params.q,
      bbox: hasValidBbox(params.bbox) ? params.bbox : undefined,
    },
  };
}
