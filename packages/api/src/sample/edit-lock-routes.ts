import type {
  SampleEditLockResponse,
  SampleLocked,
} from "@projet-igsn/domain/sample/edit-lock";

import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { Hono } from "hono";

import type { SampleAdminDeps, SampleAdminEnv } from "./admin-routes.ts";

import { validateIdParam } from "./validator.ts";

export function createSampleEditLockRoutes({ repository }: SampleAdminDeps) {
  return new Hono<SampleAdminEnv>()
    .put("/:id/lock", validateIdParam, async (c) => {
      const sample = c.get("sample");
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      if (!canUpdateSample(c.get("role"), sample)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const user = c.get("user");
      const lock = await repository.acquireEditLock(
        c.req.valid("param").id,
        user.id,
      );
      if (!lock) {
        return c.json({ error: "Not found" }, 404);
      }
      if (lock.userId !== user.id) {
        const locked: SampleLocked = {
          error: "Sample is being edited by another collaborator",
          reason: "locked",
          lock,
        };
        return c.json(locked, 409);
      }
      const body: SampleEditLockResponse = { lock };
      return c.json(body);
    })
    .delete("/:id/lock", validateIdParam, async (c) => {
      const sample = c.get("sample");
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      if (!canUpdateSample(c.get("role"), sample)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      await repository.releaseEditLock(
        c.req.valid("param").id,
        c.get("user").id,
      );
      return c.body(null, 204);
    });
}
