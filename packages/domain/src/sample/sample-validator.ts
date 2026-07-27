import { z } from "zod";

import { sampleSchema } from "./sample.ts";
import { facetQueryFields } from "./search/facets.ts";

export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 25;

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
  // Blank or non-string search degrades to "no filter", like page/perPage.
  search: z.string().trim().min(1).optional().catch(undefined),
  // Per-facet filters (type, material, nature, numeric age range...), one param
  // each (three for a range), built from the facet registry so the schema and
  // the facet set cannot drift. Every one is optional and degrades to no filter.
  // The numeric age params (ageMin/ageMax/ageUnit, unit defaulting to Ma in the
  // query builder) come from the `age` facet.
  ...facetQueryFields(),
});

export type ListSamplesQuery = z.infer<typeof listSamplesQuerySchema>;

export const listSamplesResponseSchema = z.object({
  data: z.array(sampleSchema),
  meta: z.object({ total: z.number() }),
});

export type ListSamplesResponse = z.infer<typeof listSamplesResponseSchema>;

export const sampleResponseSchema = z.object({ data: sampleSchema });

export type SampleResponse = z.infer<typeof sampleResponseSchema>;
