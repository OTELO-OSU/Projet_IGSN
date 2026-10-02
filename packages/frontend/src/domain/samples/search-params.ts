import {
  bboxSchema,
  pageSizeSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import {
  activeFacetKeys,
  facetParamKeys,
  facetQueryFields,
  SAMPLE_FACETS,
} from "@projet-igsn/domain/sample/search/facets";
import { searchTermSchema } from "@projet-igsn/domain/sample/search/search-tokens";
import { z } from "zod";

import type {
  ListSamplesParams,
  SampleFilters,
} from "#/domain/samples/client/list-samples.ts";

import {
  type SearchEngine,
  searchEngineSchema,
} from "#/domain/samples/search-engine-tabs.tsx";

export const PER_PAGE = 10;

export const searchParamsSchema = z.object({
  q: searchTermSchema,
  bbox: z.string().optional().catch(undefined),
  engine: searchEngineSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: z.undefined().or(pageSizeSchema(PER_PAGE)).optional(),
  map: z.literal(true).optional().catch(undefined),
  ...facetQueryFields(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

const NARROWER_FACETS: Record<string, readonly string[]> = {
  institutionalOrganization: ["institutionalOsu", "institutionalLaboratory"],
  institutionalOsu: ["institutionalLaboratory"],
  material: ["mineralClassification"],
};

export function clearDependents(key: string): Record<string, undefined> {
  return Object.fromEntries(
    (NARROWER_FACETS[key] ?? []).map((narrower) => [narrower, undefined]),
  );
}

const FACET_KEYS = facetParamKeys();

export function clearFacets(): Record<string, undefined> {
  return Object.fromEntries(FACET_KEYS.map((key) => [key, undefined]));
}

function hasValidBbox(bbox: string | undefined): boolean {
  return !!bbox && bboxSchema.safeParse(bbox).success;
}

export function toFilters(params: SearchParams): SampleFilters {
  const filters: SampleFilters = {};
  const record = params as Record<
    string,
    string | number | boolean | undefined
  >;
  for (const key of activeFacetKeys(record)) filters[key] = record[key];
  return filters;
}

export function narrowsByFacet(filters: SampleFilters): boolean {
  return Object.keys(filters).some(
    (key) => !SAMPLE_FACETS.some((f) => f.key === key && f.kind === "boolean"),
  );
}

export function searchQueryParams(
  params: SearchParams,
): ListSamplesParams | undefined {
  const search = params.q || undefined;
  const bbox = hasValidBbox(params.bbox) ? params.bbox : undefined;
  const filters = toFilters(params);
  if (!search && !bbox && !narrowsByFacet(filters)) return undefined;
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
  const primary = params.engine;
  return {
    active:
      primary && active.includes(primary)
        ? [primary, ...active.filter((engine) => engine !== primary)]
        : active,
    drafts: {
      q: params.q,
      bbox: hasValidBbox(params.bbox) ? params.bbox : undefined,
    },
  };
}
