import { z } from "zod";

export const addContributorBodySchema = z.strictObject({
  userId: z.uuid(),
});

export type AddContributorBody = z.infer<typeof addContributorBodySchema>;
