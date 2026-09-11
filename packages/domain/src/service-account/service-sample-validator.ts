import { z } from "zod";

import type { PublishBlocker } from "../sample/publication/sample-publish-blockers.ts";

import { createSampleSchema, updateSampleSchema } from "../sample/sample.ts";

export const createServiceSampleSchema = createSampleSchema.safeExtend({
  parentIds: z.array(z.string().trim().min(1)).max(1).optional(),
});

export type CreateServiceSample = z.infer<typeof createServiceSampleSchema>;

export const updateServiceSampleSchema = updateSampleSchema.safeExtend({
  attachments: z.never().optional(),
});

export type UpdateServiceSample = z.infer<typeof updateServiceSampleSchema>;

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

export const frozenServiceSampleSchema = z.object({
  error: z.literal("Forbidden"),
  issues: z.array(serviceSampleIssueSchema),
});

export type FrozenServiceSample = z.infer<typeof frozenServiceSampleSchema>;
