import { z } from "zod";

import { userSampleRoleSchema } from "../user-sample/model.ts";
import { userSchema } from "../user/model.ts";
import { sampleSchema } from "./sample.ts";
import { facetQueryFields } from "./search/facets.ts";
import { MAX_SEARCH_LENGTH } from "./search/search-tokens.ts";

export const PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;

// west > east is a box crossing the antimeridian, not an error: the api splits
// it into two envelopes at longitude 180 (see withinBbox). Only the ranges and
// the latitude order are invariants.
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
    north < south
  )
    return invalid();
  return { west, south, east, north };
});

export type Bbox = z.infer<typeof bboxSchema>;

export const pageSizeSchema = (fallback: (typeof PAGE_SIZES)[number]) =>
  z.coerce
    .number()
    .default(fallback)
    .catch(fallback)
    .transform((size): number =>
      PAGE_SIZES.some((allowed) => allowed === size) ? size : fallback,
    );

export const listSamplesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: pageSizeSchema(DEFAULT_PAGE_SIZE),
  // "status" orders by IGSN presence: a sample is published exactly when it has
  // an IGSN.
  sort: z.enum(["status"]).optional().catch(undefined),
  // Optional, not defaulted: a default would make the key required in typed
  // clients.
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
  // Kept when it trims to nothing: a search of blanks or bare wildcards
  // matches no sample, where an absent param lists them all.
  search: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_SEARCH_LENGTH))
    .optional()
    .catch(undefined),
  ...facetQueryFields(),
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

export const adminSampleListItemSchema = sampleSchema.extend({
  owner: userSchema.pick({ name: true, firstname: true }),
});

export type AdminSampleListItem = z.infer<typeof adminSampleListItemSchema>;

export const adminListSamplesResponseSchema = z.object({
  data: z.array(adminSampleListItemSchema),
  meta: z.object({ total: z.number() }),
});

export type AdminListSamplesResponse = z.infer<
  typeof adminListSamplesResponseSchema
>;

export const adminSampleResponseSchema = z.object({
  data: sampleSchema,
  role: userSampleRoleSchema,
});

export type AdminSampleResponse = z.infer<typeof adminSampleResponseSchema>;
