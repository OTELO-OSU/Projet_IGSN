import { z } from "zod";

import { userSchema } from "../user/model.ts";

// The lock is not on the sample model: sampleSchema also serves the public
// frontend responses.
export const sampleEditLockSchema = z.object({
  userId: z.uuid(),
  name: userSchema.shape.name,
  firstname: userSchema.shape.firstname,
  expiresAt: z.coerce.date(),
});

export type SampleEditLock = z.infer<typeof sampleEditLockSchema>;

export const sampleEditLockResponseSchema = z.object({
  lock: sampleEditLockSchema,
});

export type SampleEditLockResponse = z.infer<
  typeof sampleEditLockResponseSchema
>;

// Answered when another user holds a live lock, both by the lock route and by
// every write it guards.
export const sampleLockedSchema = sampleEditLockResponseSchema.extend({
  error: z.string(),
  reason: z.literal("locked"),
});

export type SampleLocked = z.infer<typeof sampleLockedSchema>;
