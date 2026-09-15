import { z } from "zod";

import type { PublishBlocker } from "../sample/publication/sample-publish-blockers.ts";

import { coreSampleSchema } from "../sample/core/core-sample-schema.ts";

export const coreListSamplesResponseSchema = z.object({
  data: z.array(coreSampleSchema),
  meta: z.object({ total: z.number().int().nonnegative() }),
});

export type CoreListSamplesResponse = z.infer<
  typeof coreListSamplesResponseSchema
>;

export type ServiceSampleIssueCode =
  | PublishBlocker
  | "location_inherited_from_parent"
  | "manual_group_not_attachable"
  | "field_frozen";

export const serviceSampleIssueSchema = z.object({
  path: z.string().optional(),
  code: z.string(),
  message: z.string().optional(),
});

export type ServiceSampleIssue = z.infer<typeof serviceSampleIssueSchema>;

export const invalidServiceSampleSchema = z.object({
  error: z.literal("Invalid sample"),
  issues: z.array(serviceSampleIssueSchema),
});

export type InvalidServiceSample = z.infer<typeof invalidServiceSampleSchema>;

export const frozenServiceSampleSchema = invalidServiceSampleSchema.extend({
  error: z.literal("Forbidden"),
});

export type FrozenServiceSample = z.infer<typeof frozenServiceSampleSchema>;
