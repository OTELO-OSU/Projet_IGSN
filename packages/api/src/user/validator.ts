import { MAX_SEARCH_LENGTH } from "@projet-igsn/domain/sample/search/search-tokens";
import { orcidSchema } from "@projet-igsn/domain/user/orcid";
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

// null clears the orcid; strict() rejects any other field (mass assignment).
const setOrcidSchema = z.object({ orcid: orcidSchema.nullable() }).strict();

export const validateSetOrcidBody = validator("json", (value, c) => {
  const parsed = setOrcidSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid ORCID" }, 400);
  }
  return parsed.data;
});
