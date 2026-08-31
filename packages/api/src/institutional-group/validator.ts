import { institutionalGroupRefSchema } from "@projet-igsn/domain/institutional-group/model";
import { validator } from "hono/validator";
import { z } from "zod";

const INVALID = "Invalid institutional group" as const;

export const validateInstitutionalGroupRefParams = validator(
  "param",
  (value, c) => {
    const parsed = institutionalGroupRefSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: INVALID }, 400);
    }
    return parsed.data;
  },
);

const managerParamsSchema = z
  .object({ userId: z.uuid() })
  .and(institutionalGroupRefSchema);

export const validateInstitutionalGroupManagerParams = validator(
  "param",
  (value, c) => {
    const parsed = managerParamsSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: INVALID }, 400);
    }
    return parsed.data;
  },
);
