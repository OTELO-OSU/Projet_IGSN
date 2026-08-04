import { z } from "zod";

// The GET /admin/me contract: the verified token claims echoed by the api,
// plus the caller's stored ORCID. Shared so the admin app parses the response
// at the boundary instead of hand-writing the shape.
export const meSchema = z.object({
  sub: z.string(),
  username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  orcid: z.string().nullable(),
});
export type Me = z.infer<typeof meSchema>;
