import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { Hono } from "hono";

import type { SampleAdminDeps, SampleAdminEnv } from "./admin-routes.ts";

import { attachmentDownload } from "./attachment-download.ts";
import { requireEditLock } from "./require-edit-lock.ts";
import {
  validateAttachmentParams,
  validateAttachmentUpload,
  validateIdParam,
} from "./validator.ts";

export function createSampleAttachmentRoutes({
  repository,
  attachmentsRepository,
}: SampleAdminDeps) {
  const unlockedSample = requireEditLock(repository);

  return new Hono<SampleAdminEnv>()
    .post(
      "/:id/attachments",
      validateIdParam,
      unlockedSample,
      validateAttachmentUpload,
      async (c) => {
        const sample = c.get("sample");
        if (sample && !canUpdateSample(c.get("role"), sample)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const { file, title, targetResourceType, description } =
          c.req.valid("form");
        const created = await attachmentsRepository.create(
          c.req.valid("param").id,
          {
            name: file.name,
            mediaType: file.type || "application/octet-stream",
            title: title ?? null,
            targetResourceType: targetResourceType ?? null,
            description: description ?? null,
          },
          new Uint8Array(await file.arrayBuffer()),
        );
        if (created === "limit_reached") {
          return c.json({ error: "Attachment limit reached" }, 409);
        }
        if (!created) {
          return c.json({ error: "Sample not found" }, 404);
        }
        return c.json({ data: created }, 201);
      },
    )
    .get(
      "/:id/attachments/:attachmentId",
      validateAttachmentParams,
      async (c) => {
        const { id, attachmentId } = c.req.valid("param");
        const found = await attachmentsRepository.getContent(id, attachmentId);
        if (!found) {
          return c.json({ error: "Attachment not found" }, 404);
        }
        return attachmentDownload(found.attachment, found.content);
      },
    )
    .delete(
      "/:id/attachments/:attachmentId",
      validateAttachmentParams,
      unlockedSample,
      async (c) => {
        const sample = c.get("sample");
        if (sample && !canUpdateSample(c.get("role"), sample)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const { id, attachmentId } = c.req.valid("param");
        const removed = await attachmentsRepository.remove(id, attachmentId);
        if (!removed) {
          return c.json({ error: "Attachment not found" }, 404);
        }
        return c.body(null, 204);
      },
    );
}
