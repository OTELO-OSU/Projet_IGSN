import { z } from "zod";

export const orcidSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, { message: "invalid ORCID iD" });

export const orcidAuthorizationSchema = z.object({ url: z.url() });
export type OrcidAuthorization = z.infer<typeof orcidAuthorizationSchema>;
