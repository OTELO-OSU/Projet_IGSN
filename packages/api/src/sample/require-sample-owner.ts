import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { MiddlewareHandler } from "hono";

import { z } from "zod";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

// Authorizes every admin route that names a sample id, in one place: guarding
// the reads alone would leave the writes open (ADR 0019).
export function requireSampleOwner(
  repository: SampleRepository,
): MiddlewareHandler<AuthenticatedEnv> {
  return async (c, next) => {
    // A malformed uuid matches no sample and would make the uuid-typed query
    // throw; let validateIdParam answer 400 for it.
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) {
      return next();
    }
    const access = await repository.getSampleAccess(id.data, c.get("user").id);
    if (access === "forbidden") {
      return c.json({ error: "Forbidden" }, 403);
    }
    // "missing" falls through to the route, which answers its own 404.
    await next();
  };
}
