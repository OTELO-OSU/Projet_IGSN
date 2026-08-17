import {
  addManualGroupMemberBodySchema,
  listManualGroupsQuerySchema,
  manualGroupNameBodySchema,
} from "@projet-igsn/domain/manual-group/manual-group-validator";
import { validator } from "hono/validator";
import { z } from "zod";

import { validateUuidIdParam } from "../uuid-param.ts";

export const validateManualGroupIdParam = validateUuidIdParam(
  "Invalid manual group id",
);

const memberParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });

export const validateManualGroupMemberParams = validator(
  "param",
  (value, c) => {
    const parsed = memberParamsSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: "Invalid manual group member" }, 400);
    }
    return parsed.data;
  },
);

export const validateListManualGroupsQuery = validator("query", (value, c) => {
  const parsed = listManualGroupsQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});

export const validateManualGroupNameBody = validator("json", (value, c) => {
  const parsed = manualGroupNameBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid manual group name" }, 400);
  }
  return parsed.data;
});

export const validateAddManualGroupMemberBody = validator(
  "json",
  (value, c) => {
    const parsed = addManualGroupMemberBodySchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: "Invalid user id" }, 400);
    }
    return parsed.data;
  },
);
