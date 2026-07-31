import { validator } from "hono/validator";
import { z } from "zod";

const searchUsersQuerySchema = z.strictObject({
  search: z.string().trim().min(2),
});

export const validateSearchUsersQuery = validator("query", (value, c) => {
  const parsed = searchUsersQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});
