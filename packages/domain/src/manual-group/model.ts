import { z } from "zod";

export const manualGroupNameSchema = z.string().trim().min(1).max(120);

export const manualGroupSchema = z.object({
  id: z.uuid(),
  name: manualGroupNameSchema,
});

export type ManualGroup = z.infer<typeof manualGroupSchema>;
