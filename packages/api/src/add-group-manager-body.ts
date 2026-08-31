import { addGroupManagerBodySchema } from "@projet-igsn/domain/user/user-validator";
import { validator } from "hono/validator";

export const validateAddGroupManagerBody = validator("json", (value, c) => {
  const parsed = addGroupManagerBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid user id" }, 400);
  }
  return parsed.data;
});
