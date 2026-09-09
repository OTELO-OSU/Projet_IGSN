import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type { MiddlewareHandler } from "hono";

import { HTTPException } from "hono/http-exception";

import { hashApiKey } from "../service-account/api-key.ts";

export type ServiceEnv = {
  Variables: { serviceAccount: ServiceAccount };
};

const bearerKey = (authorization: string | undefined) =>
  authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : undefined;

export function requireServiceAccount(
  serviceAccounts: Pick<ServiceAccountRepository, "findByApiKeyHash">,
): MiddlewareHandler<ServiceEnv> {
  return async (c, next) => {
    const key = bearerKey(c.req.header("Authorization"));
    const account = key
      ? await serviceAccounts.findByApiKeyHash(hashApiKey(key))
      : undefined;
    if (!account) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    c.set("serviceAccount", account);
    await next();
  };
}
