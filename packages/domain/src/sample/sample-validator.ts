import { z } from "zod";

import { institutionFilterSchema } from "../institutional-group/institution-filter.ts";
import { manualGroupSchema } from "../manual-group/model.ts";
import { userSampleRoleSchema } from "../user-sample/model.ts";
import { userSchema } from "../user/model.ts";
import { createSampleSchema, sampleSchema } from "./sample.ts";
import { facetQueryFields } from "./search/facets.ts";
import { MAX_SEARCH_LENGTH } from "./search/search-tokens.ts";

export const updateSampleBodySchema = createSampleSchema.extend({
  expectedUpdatedAt: z.coerce.date(),
});

export type UpdateSampleBody = z.infer<typeof updateSampleBodySchema>;

export const contactSampleOwnerBodySchema = z.strictObject({
  name: z.string().trim().min(1),
  firstname: z.string().trim().min(1),
  email: z.email(),
  message: z.string().trim().min(1).max(5000),
});

export type ContactSampleOwnerBody = z.infer<
  typeof contactSampleOwnerBodySchema
>;

export const sampleConflictSchema = z.object({
  error: z.string(),
  reason: z.enum(["stale", "unpublishable", "locked"]),
});

export type SampleConflict = z.infer<typeof sampleConflictSchema>;

export const PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;

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
  sort: z.enum(["status"]).optional().catch(undefined),
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_SEARCH_LENGTH))
    .optional()
    .catch(undefined),
  ownership: z.enum(["mine", "shared"]).optional().catch(undefined),
  status: z.enum(["draft", "published"]).optional().catch(undefined),
  ownerId: z.uuid().optional().catch(undefined),
  institution: institutionFilterSchema.optional().catch(undefined),
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
  owner: userSchema
    .pick({ name: true, firstname: true })
    .extend({ status: userSchema.shape.status.optional() })
    .nullable(),
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
  manualGroupOptions: z.array(manualGroupSchema).default([]),
});

export type AdminSampleResponse = z.infer<typeof adminSampleResponseSchema>;
