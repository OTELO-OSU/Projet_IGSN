import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";

import { Hono } from "hono";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";

export function createServiceRoutes(
  serviceAccounts: Pick<ServiceAccountRepository, "findByApiKeyHash">,
) {
  return new Hono<ServiceEnv>()
    .use("*", requireServiceAccount(serviceAccounts))
    .get("/ping", (c) => c.json({ ok: true }));
}
