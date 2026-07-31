import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { MiddlewareHandler } from "hono";

import { z } from "zod";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

// The guarded routes read the sample this guard already fetched; `undefined` is
// "no such sample", which each route answers with its own 404.
export type SampleAccessEnv = {
  Variables: AuthenticatedEnv["Variables"] & {
    sample: Sample | undefined;
    role: UserSampleRole | null;
  };
};

// Authorizes every admin route that names a sample id, in one place: guarding
// the reads alone would leave the writes open (ADR 0019). One retrieval decides
// it, and the routes reuse it rather than fetching the sample again.
export function requireSampleAccess(
  repository: SampleRepository,
): MiddlewareHandler<SampleAccessEnv> {
  return async (c, next) => {
    // A malformed uuid matches no sample and would make the uuid-typed query
    // throw; let validateIdParam answer 400 for it.
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) {
      return next();
    }
    const found = await repository.get(id.data, c.get("user").id);
    if (found && found.role === null) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set("sample", found?.sample);
    c.set("role", found?.role ?? null);
    await next();
  };
}
