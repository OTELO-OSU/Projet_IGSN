import { z } from "zod";

import type { PublishBlocker } from "../sample/publication/sample-publish-blockers.ts";

import { createSampleSchema } from "../sample/sample.ts";

export const createServiceSampleSchema = createSampleSchema.safeExtend({
  parentIds: z.array(z.string().trim().min(1)).max(1).optional(),
});

export type CreateServiceSample = z.infer<typeof createServiceSampleSchema>;

export type ServiceSampleIssueCode =
  | PublishBlocker
  | "location_inherited_from_parent"
  | "manual_group_not_attachable";

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
