import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { SendMail } from "../mail/send-mail.ts";

import { attachmentDownload } from "./attachment-download.ts";
import { contactSampleOwnerMail } from "./contact-sample-owner-mail.ts";
import {
  validateContactBody,
  validateIgsnAttachmentParams,
  validateIgsnParam,
  validateListQuery,
} from "./validator.ts";

export function createSampleRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
  userSampleRepository: UserSampleRepository,
  mail?: { sendMail: SendMail; frontendUrl: string },
) {
  return new Hono()
    .get("/", validateListQuery, async (c) => {
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
    .post(
      "/:igsn/contact",
      validateIgsnParam,
      validateContactBody,
      async (c) => {
        if (!mail) {
          throw new HTTPException(500, { message: "Mail is not configured" });
        }
        const { igsn } = c.req.valid("param");
        const sample = await repository.getPublishedByIgsn(igsn);
        if (!sample) {
          return c.json({ error: "Sample not found" }, 404);
        }
        const recipients =
          await userSampleRepository.listContactRecipients(sample);
        if (recipients.length === 0) {
          throw new HTTPException(409, {
            message: "This sample's owner cannot be contacted",
          });
        }
        const visitor = c.req.valid("json");
        await mail.sendMail({
          to: recipients,
          replyTo: visitor.email,
          ...(await contactSampleOwnerMail({
            visitor,
            sampleName: sample.name,
            igsn,
            frontendUrl: mail.frontendUrl,
          })),
        });
        return c.body(null, 204);
      },
    )
    .get(
      "/:igsn/attachments/:attachmentId",
      validateIgsnAttachmentParams,
      async (c) => {
        const { igsn, attachmentId } = c.req.valid("param");
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
