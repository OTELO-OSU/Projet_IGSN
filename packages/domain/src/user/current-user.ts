import { z } from "zod";

import { userStatusSchema } from "./model.ts";

// The GET /admin/currentUser contract: the verified token claims echoed by the api,
// plus the caller's stored ORCID. Shared so the admin app parses the response
// at the boundary instead of hand-writing the shape.
export const currentUserSchema = z.object({
  sub: z.string(),
  username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  orcid: z.string().nullable(),
  status: userStatusSchema,
  superAdmin: z.boolean(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;
