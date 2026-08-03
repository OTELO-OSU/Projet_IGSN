import { MAX_SEARCH_LENGTH } from "@projet-igsn/domain/sample/search/search-tokens";
import { validator } from "hono/validator";
import { z } from "zod";

const searchUsersQuerySchema = z.strictObject({
  // Absent browses the whole directory; present still has to be a real term.
  search: z.string().trim().min(2).max(MAX_SEARCH_LENGTH).optional(),
});

export const validateSearchUsersQuery = validator("query", (value, c) => {
  const parsed = searchUsersQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});
