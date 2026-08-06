import { z } from "zod";

export const USER_STATUSES = ["pending", "accepted", "rejected"] as const;

export const userStatusSchema = z.enum(USER_STATUSES);

export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string().nullable(),
  firstname: z.string().nullable(),
  // Self-declared ORCID iD, also the lookup key for ORCID logins (ADR 0020).
  orcid: z.string().nullable(),
  status: userStatusSchema,
  superAdmin: z.boolean(),
});

export type User = z.infer<typeof userSchema>;
