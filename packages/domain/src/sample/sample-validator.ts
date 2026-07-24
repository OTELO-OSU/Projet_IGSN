import { z } from "zod";

import { numericUnitSchema } from "./age/numeric-unit.ts";
import { sampleSchema } from "./sample.ts";

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
  // Numeric age range filter: bounds in `ageUnit` (defaults to Ma in the query
  // if omitted). Matches samples whose numeric age range overlaps [ageMin, ageMax].
  ageMin: z.coerce.number().optional().catch(undefined),
  ageMax: z.coerce.number().optional().catch(undefined),
  ageUnit: numericUnitSchema.optional().catch(undefined),
});

export type ListSamplesQuery = z.infer<typeof listSamplesQuerySchema>;

export const listSamplesResponseSchema = z.object({
  data: z.array(sampleSchema),
  meta: z.object({ total: z.number() }),
});

export type ListSamplesResponse = z.infer<typeof listSamplesResponseSchema>;

export const sampleResponseSchema = z.object({ data: sampleSchema });

export type SampleResponse = z.infer<typeof sampleResponseSchema>;
