import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";

import { Hono } from "hono";

import { attachmentDownload } from "./attachment-download.ts";
import {
  validateIgsnAttachmentParams,
  validateIgsnParam,
  validateListQuery,
} from "./validator.ts";

// Public, unauthenticated reads for the frontend: published samples only, looked
// up by IGSN. Writes and admin reads (all samples, by id) live in admin-routes.ts
// under the authenticated /admin mount.
export function createSampleRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
) {
  return new Hono()
    .get("/", validateListQuery, async (c) => {
      // Forward pagination, search and every facet filter; the published list
      // is not user-sortable, so sort/order are dropped.
      const { sort: _sort, order: _order, ...query } = c.req.valid("query");
      const { data, total } = await repository.listPublished(query);
      const body: ListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get("/:igsn", validateIgsnParam, async (c) => {
      const sample = await repository.getPublishedByIgsn(
        c.req.valid("param").igsn,
      );
      if (!sample) {
        return c.json({ error: "Sample not found" }, 404);
      }
      const body: SampleResponse = { data: sample };
      return c.json(body);
    })
    .get(
      "/:igsn/attachments/:attachmentId",
      validateIgsnAttachmentParams,
      async (c) => {
        const { igsn, attachmentId } = c.req.valid("param");
        // Resolving through the published-only lookup keeps draft files private.
        const sample = await repository.getPublishedByIgsn(igsn);
        if (!sample) {
          return c.json({ error: "Sample not found" }, 404);
        }
        const found = await attachmentsRepository.getContent(
          sample.id,
          attachmentId,
        );
        if (!found) {
          return c.json({ error: "Attachment not found" }, 404);
        }
        return attachmentDownload(found.attachment, found.content);
      },
    );
}
