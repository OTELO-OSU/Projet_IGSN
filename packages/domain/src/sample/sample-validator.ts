import { z } from "zod";

import { sampleSchema } from "./sample.ts";
import { facetQueryFields } from "./search/facets.ts";
import { MAX_SEARCH_LENGTH } from "./search/search-tokens.ts";

export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 25;

// A geographic bounding box parsed from the URL param "west,south,east,north"
// (degrees). ponytail: v1 ceiling is west <= east; a dateline-wrapping box
// (west > east) is rejected here. Supporting it later means splitting the
// envelope into an OR of two boxes at longitude 180, deferred.
export const bboxSchema = z.string().transform((value, ctx) => {
  const parts = value.split(",").map(Number);
  const invalid = () => {
    ctx.addIssue({ code: "custom", message: "Invalid bounding box" });
    return z.NEVER;
  };
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return invalid();
  const [west, south, east, north] = parts as [number, number, number, number];
  if (
    west < -180 ||
    west > 180 ||
    east < -180 ||
    east > 180 ||
    south < -90 ||
    south > 90 ||
    north < -90 ||
    north > 90 ||
    north < south ||
    east < west
  )
    return invalid();
  return { west, south, east, north };
});

export type Bbox = z.infer<typeof bboxSchema>;

export const listSamplesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: z.coerce
    .number()
    .default(DEFAULT_PAGE_SIZE)
    .catch(DEFAULT_PAGE_SIZE)
    .transform((size): number =>
      PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
    ),
  // Sorting is applied server-side (the list is paginated). "status" orders by
  // IGSN presence: a sample is published exactly when it has an IGSN.
  sort: z.enum(["status"]).optional().catch(undefined),
  // Optional, not defaulted: a default would make the key required in typed
  // clients. Consumers treat an absent order as asc.
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
  // `*` expands to `\S*` in a server-side regex, so an unbounded query
  // backtracks per row. Truncated, not rejected: dropping it means no filter.
  // Kept when it trims to nothing: a search of blanks or bare wildcards matches
  // no sample, where an absent param lists them all.
  search: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_SEARCH_LENGTH))
    .optional()
    .catch(undefined),
  // Per-facet filters (type, material, nature, numeric age range...), one param
  // each (three for a range), built from the facet registry so the schema and
  // the facet set cannot drift. Every one is optional and degrades to no filter.
  // The numeric age params (ageMin/ageMax/ageUnit, unit defaulting to Ma in the
  // query builder) come from the `age` facet.
  ...facetQueryFields(),
  // Malformed or out-of-range boxes degrade to "no filter", like search.
  bbox: bboxSchema.optional().catch(undefined),
});

export type ListSamplesQuery = z.infer<typeof listSamplesQuerySchema>;

export const listSamplesResponseSchema = z.object({
  data: z.array(sampleSchema),
  meta: z.object({ total: z.number() }),
});

export type ListSamplesResponse = z.infer<typeof listSamplesResponseSchema>;

export const sampleResponseSchema = z.object({ data: sampleSchema });

export type SampleResponse = z.infer<typeof sampleResponseSchema>;
