import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { MiddlewareHandler } from "hono";

import { z } from "zod";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

// The guarded routes read the sample this guard already fetched; `undefined` is
// "no such sample", which each route answers with its own 404.
export type OwnedSampleEnv = {
  Variables: AuthenticatedEnv["Variables"] & { sample: Sample | undefined };
};

// Authorizes every admin route that names a sample id, in one place: guarding
// the reads alone would leave the writes open (ADR 0019). One retrieval decides
// it, and the routes reuse it rather than fetching the sample again.
export function requireSampleOwner(
  repository: SampleRepository,
): MiddlewareHandler<OwnedSampleEnv> {
  return async (c, next) => {
    // A malformed uuid matches no sample and would make the uuid-typed query
    // throw; let validateIdParam answer 400 for it.
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) {
      return next();
    }
    const found = await repository.get(id.data, c.get("user").id);
    if (found && !found.owned) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set("sample", found?.sample);
    await next();
  };
}
