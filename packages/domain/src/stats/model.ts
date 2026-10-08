import { z } from "zod";

export const statsSchema = z.object({
  samples: z.int().nonnegative(),
  users: z.int().nonnegative(),
});

export type Stats = z.infer<typeof statsSchema>;
