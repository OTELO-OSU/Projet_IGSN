import { validator } from "hono/validator";
import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid() });

export const validateUuidIdParam = (error: string) =>
  validator("param", (value, c) => {
    const parsed = idParamSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error }, 400);
    }
    return parsed.data;
  });
