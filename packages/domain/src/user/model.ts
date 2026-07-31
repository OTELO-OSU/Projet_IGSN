import { z } from "zod";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string().nullable(),
  firstname: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;
