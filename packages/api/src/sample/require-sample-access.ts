import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { MiddlewareHandler } from "hono";

import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canPublishSamples } from "@projet-igsn/domain/user/can-publish-samples";
import { z } from "zod";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { getModerationScope } from "../auth/moderation-scope.ts";

export type SampleAccessEnv = {
  Variables: AuthenticatedEnv["Variables"] & {
    sample: Sample | undefined;
    role: UserSampleRole | null;
    shareRole: UserSampleRole | null;
    moderating: boolean;
    managed: boolean;
  };
};

async function inModerationReach(
  repository: SampleRepository,
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
  sampleId: string,
): Promise<boolean> {
  const scope = await getModerationScope(users, user);
  return scope !== null && (await repository.isModerated(sampleId, scope));
}

export function requireSampleAccess(
  repository: SampleRepository,
  users: UserRepository,
): MiddlewareHandler<SampleAccessEnv> {
  return async (c, next) => {
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) {
      return next();
    }
    const user = c.get("user");
    const found = await repository.get(id.data, user.id);
    const managed =
      found !== null &&
      (user.superAdmin ||
        (await inModerationReach(repository, users, user, found.sample.id)));
    const moderating = managed && !isSampleOwner(found?.role ?? null);
    if (found && !managed && found.role === null) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (found?.sample.status === "tombstone") {
      if (!managed) {
        return c.json({ error: "Sample not found" }, 404);
      }
      if (c.req.method !== "GET" && !c.req.path.endsWith("/status")) {
        return c.json({ error: "Sample is tombstoned" }, 409);
      }
    }
    if (
      c.req.method !== "GET" &&
      found &&
      hasPermanentIgsn(found.sample) &&
      !canPublishSamples(user)
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }
    // Moderation never grants collaborator management.
    const shareRole =
      found && user.superAdmin ? "owner" : (found?.role ?? null);
    c.set("sample", found?.sample);
    c.set("moderating", moderating);
    c.set("managed", managed);
    c.set("shareRole", shareRole);
    c.set(
      "role",
      moderating && !isSampleOwner(shareRole) ? "editor" : shareRole,
    );
    await next();
  };
}
