import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { PublicUsersResponse } from "@projet-igsn/domain/user/user-validator";

import { Hono } from "hono";

import { validateListPublicUsersQuery } from "./validator.ts";

// ponytail: unpaginated, the list is bounded by the number of publishing users; page it if that number ever grows.
export function createPublicUserRoutes(users: UserRepository) {
  return new Hono().get("/", validateListPublicUsersQuery, async (c) => {
    const body: PublicUsersResponse = {
      data: await users.listPublicUsers(c.req.valid("query").include),
    };
    return c.json(body);
  });
}
