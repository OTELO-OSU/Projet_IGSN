import { z } from "zod";

// A researcher known to the registry. Provisioned from the verified token on
// first authenticated request (no user-management UI yet), so email is the
// identity key and the name parts are optional: the IdP may release neither.
export const userSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  firstname: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;
