import { validator } from "hono/validator";
import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid() });

// A malformed uuid matches no row, and unvalidated it would make the uuid-typed
// query throw, so reject it up front rather than 500 later.
export const validateUuidIdParam = (error: string) =>
  validator("param", (value, c) => {
    const parsed = idParamSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error }, 400);
    }
    return parsed.data;
  });
