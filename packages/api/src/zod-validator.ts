import type { ValidationTargets } from "hono";
import type { z } from "zod";

import { validator } from "hono/validator";

export const zodValidator = <
  Target extends keyof ValidationTargets,
  Schema extends z.ZodType,
>(
  target: Target,
  schema: Schema,
  error: string,
) =>
  validator(target, (value, c) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error }, 400);
    }
    return parsed.data as z.output<Schema>;
  });
