import type { SampleLocked } from "@projet-igsn/domain/sample/edit-lock";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { MiddlewareHandler } from "hono";

import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { z } from "zod";

import type { SampleAccessEnv } from "./require-sample-access.ts";

export function requireEditLock(
  repository: SampleRepository,
): MiddlewareHandler<SampleAccessEnv> {
  return async (c, next) => {
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) {
      return next();
    }
    const sample = c.get("sample");
    if (!sample || !canUpdateSample(c.get("role"), sample)) {
      return next();
    }
    const lock = await repository.getEditLock(id.data);
    if (lock && lock.userId !== c.get("user").id) {
      const body: SampleLocked = {
        error: "Sample is being edited by another collaborator",
        reason: "locked",
        lock,
      };
      return c.json(body, 409);
    }
    await next();
  };
}
