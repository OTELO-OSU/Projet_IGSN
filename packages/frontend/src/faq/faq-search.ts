import { z } from "zod";

export const faqSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
});
