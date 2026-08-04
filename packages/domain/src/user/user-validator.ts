import { z } from "zod";

import { userSchema } from "./model.ts";

export const listUsersResponseSchema = z.object({
  data: z.array(userSchema),
});

export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;
