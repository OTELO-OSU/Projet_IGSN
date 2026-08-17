import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { MiddlewareHandler } from "hono";

import { canPublishSamples } from "@projet-igsn/domain/user/can-publish-samples";
import { z } from "zod";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

export type SampleAccessEnv = {
  Variables: AuthenticatedEnv["Variables"] & {
    sample: Sample | undefined;
    role: UserSampleRole | null;
  };
};

export function requireSampleAccess(
  repository: SampleRepository,
): MiddlewareHandler<SampleAccessEnv> {
  return async (c, next) => {
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) {
      return next();
    }
    const user = c.get("user");
    const found = await repository.get(id.data, user.id);
    if (found && found.role === null && !user.superAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (
      c.req.method !== "GET" &&
      found?.sample.published &&
      !canPublishSamples(user)
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set("sample", found?.sample);
    c.set("role", found && user.superAdmin ? "owner" : (found?.role ?? null));
    await next();
  };
}
