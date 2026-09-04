import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type {
  ListServiceAccountsResponse,
  ServiceAccountResponse,
} from "@projet-igsn/domain/service-account/service-account-validator";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import {
  validateListServiceAccountsQuery,
  validateServiceAccountBody,
  validateServiceAccountIdParam,
} from "./validator.ts";

const NOT_FOUND = { error: "Service account not found" } as const;
const NAME_TAKEN = { reason: "name_taken" } as const;

const logAccountChange = (actor: string, account: string, action: string) =>
  console.info("service account changed", { actor, account, action });

export function createServiceAccountRoutes(
  repository: ServiceAccountRepository,
) {
  return new Hono<AuthenticatedEnv>()
    .use("*", requireSuperAdmin)
    .get("/", validateListServiceAccountsQuery, async (c) => {
      const { data, total } = await repository.list(c.req.valid("query"));
      const body: ListServiceAccountsResponse = { data, meta: { total } };
      return c.json(body);
    })
    .post("/", requireActiveSession, validateServiceAccountBody, async (c) => {
      const created = await repository.create(c.req.valid("json"));
      if (created === "name_taken") {
        return c.json(NAME_TAKEN, 409);
      }
      logAccountChange(c.get("user").id, created.id, "created");
      const body: ServiceAccountResponse = { data: created };
      return c.json(body, 201);
    })
    .get("/:id", validateServiceAccountIdParam, async (c) => {
      const account = await repository.get(c.req.valid("param").id);
      if (!account) {
        return c.json(NOT_FOUND, 404);
      }
      const body: ServiceAccountResponse = { data: account };
      return c.json(body);
    })
    .put(
      "/:id",
      requireActiveSession,
      validateServiceAccountIdParam,
      validateServiceAccountBody,
      async (c) => {
        const { id } = c.req.valid("param");
        const updated = await repository.update(id, c.req.valid("json"));
        if (updated === "name_taken") {
          return c.json(NAME_TAKEN, 409);
        }
        logAccountChange(c.get("user").id, id, "updated");
        const body: ServiceAccountResponse = { data: updated };
        return c.json(body);
      },
    )
    .delete(
      "/:id",
      requireActiveSession,
      validateServiceAccountIdParam,
      async (c) => {
        const { id } = c.req.valid("param");
        await repository.remove(id);
        logAccountChange(c.get("user").id, id, "deleted");
        return c.body(null, 204);
      },
    );
}
