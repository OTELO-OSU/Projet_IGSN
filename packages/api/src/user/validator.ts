import { setInstitutionalGroupsSchema } from "@projet-igsn/domain/institutional-group/institutional-groups-validator";
import { MAX_MANUAL_GROUP_MANAGERS } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { MAX_SEARCH_LENGTH } from "@projet-igsn/domain/sample/search/search-tokens";
import { userStatusSchema } from "@projet-igsn/domain/user/model";
import { orcidSchema } from "@projet-igsn/domain/user/orcid";
import {
  listUsersQuerySchema,
  updateUserSchema,
} from "@projet-igsn/domain/user/user-validator";
import { validator } from "hono/validator";
import { z } from "zod";

import { validateUuidIdParam } from "../uuid-param.ts";

const searchUsersQuerySchema = z.strictObject({
  search: z.string().trim().min(2).max(MAX_SEARCH_LENGTH).optional(),
  ids: z
    .string()
    .transform((value) => value.split(","))
    .pipe(z.array(z.uuid()).min(1).max(MAX_MANUAL_GROUP_MANAGERS))
    .optional(),
  excludeCollaboratorsOf: z.uuid().optional(),
  status: userStatusSchema.exclude(["rejected"]).optional(),
  excludeMembersOf: z.uuid().optional(),
  includeSelf: z.stringbool().optional(),
});

export const validateSearchUsersQuery = validator("query", (value, c) => {
  const parsed = searchUsersQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});

const setOrcidSchema = z.object({ orcid: orcidSchema.nullable() }).strict();

export const validateSetOrcidBody = validator("json", (value, c) => {
  const parsed = setOrcidSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid ORCID" }, 400);
  }
  return parsed.data;
});

export const validateSetInstitutionalGroupsBody = validator(
  "json",
  (value, c) => {
    const parsed = setInstitutionalGroupsSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: "Invalid institutional groups" }, 400);
    }
    return parsed.data;
  },
);

export const validateUserIdParam = validateUuidIdParam("Invalid user id");

export const validateListUsersQuery = validator("query", (value, c) => {
  const parsed = listUsersQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});

export const validateUpdateUserBody = validator("json", (value, c) => {
  const parsed = updateUserSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid user" }, 400);
  }
  return parsed.data;
});
