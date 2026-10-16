import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { isPublicationQueued } from "@projet-igsn/domain/sample/publication/is-publication-queued";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { publishQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { canRequestSampleDeletion } from "@projet-igsn/domain/user-sample/can-request-sample-deletion";
import { canSetSampleStatus } from "@projet-igsn/domain/user-sample/can-set-sample-status";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { Hono } from "hono";

import type { SampleAdminDeps, SampleAdminEnv } from "./admin-routes.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { notifySuperAdmins } from "../mail/notify-super-admins.ts";
import { notifyPublication } from "./notify-publication.ts";
import { requireEditLock } from "./require-edit-lock.ts";
import { sampleDeletionRequestMail } from "./sample-deletion-request-mail.ts";
import { uploadLimit } from "./upload-limit.ts";
import {
  validateIdParam,
  validateRequestDeletionBody,
  validateStatusBody,
} from "./validator.ts";

export function createSamplePublicationRoutes({
  repository,
  userSampleRepository,
  users,
  mail,
}: SampleAdminDeps) {
  const unlockedSample = requireEditLock(repository);

  return new Hono<SampleAdminEnv>()
    .post(
      "/:id/deletion-request",
      requireActiveSession,
      validateIdParam,
      validateRequestDeletionBody,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Sample not found" }, 404);
        }
        const requester = c.get("user");
        if (!canRequestSampleDeletion(c.get("role"), sample, requester)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        if (mail) {
          const { reason } = c.req.valid("json");
          // ponytail: fire and forget; a retry queue if a lost request ever matters.
          void notifySuperAdmins(
            users,
            () =>
              sampleDeletionRequestMail({
                requester,
                sample,
                reason,
                adminUrl: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the sample deletion request",
          );
        }
        return c.body(null, 204);
      },
    )
    .post("/:id/publish", validateIdParam, unlockedSample, async (c) => {
      const id = c.req.valid("param").id;
      const sample = c.get("sample");
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      if (!isSampleEditor(c.get("role"))) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const query = publishQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json({ error: "Invalid publish status" }, 400);
      }
      const { status, publishedAt } = query.data;
      if (isPublicationQueued(sample) || hasPermanentIgsn(sample)) {
        return c.json({ error: "Sample is already published" }, 409);
      }
      // ponytail: the guard's read and publish are separate transactions. Read and publish in one txn if that race matters.
      if (
        samplePublishBlockers(sample, uploadLimit, c.get("user")).length > 0
      ) {
        return c.json({ error: "Sample is not ready to publish" }, 409);
      }
      const published = await repository.publish(id, status, publishedAt);
      if (!published) {
        return c.json({ error: "Not found" }, 404);
      }
      if (mail) {
        void notifyPublication({
          event: status === "embargo" ? "embargo_started" : status,
          userSamples: userSampleRepository,
          sample: published,
          actor: c.get("user"),
          mail,
        });
      }
      return c.json({ data: published });
    })
    .put(
      "/:id/status",
      validateIdParam,
      validateStatusBody,
      unlockedSample,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!hasPermanentIgsn(sample)) {
          return c.json({ error: "Sample is not published" }, 409);
        }
        const body = c.req.valid("json");
        if (
          !canSetSampleStatus(
            c.get("role"),
            c.get("managed"),
            sample,
            body.status,
          )
        ) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const id = c.req.valid("param").id;
        const updated = await repository.setStatus(id, body);
        if (!updated) {
          return c.json({ error: "Not found" }, 404);
        }
        if (
          mail &&
          sample.status === "embargo" &&
          body.status === "published"
        ) {
          void notifyPublication({
            event: "embargo_ended",
            userSamples: userSampleRepository,
            sample: updated,
            actor: c.get("user"),
            mail,
          });
        }
        return c.json({ data: updated });
      },
    );
}
