import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { ListUsersResponse } from "@projet-igsn/domain/user/user-validator";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { validateSearchUsersQuery } from "./validator.ts";

export function createUserAdminRoutes(userRepository: UserRepository) {
  return new Hono<AuthenticatedEnv>().get(
    "/",
    validateSearchUsersQuery,
    async (c) => {
      const body: ListUsersResponse = {
        data: await userRepository.search(
          c.req.valid("query").search,
          c.get("user").id,
        ),
      };
      return c.json(body);
    },
  );
}
