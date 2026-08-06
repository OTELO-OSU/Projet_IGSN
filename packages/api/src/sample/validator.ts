import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { uploadSampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { addContributorBodySchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { validator } from "hono/validator";
import { z } from "zod";

import { idParamSchema, validateUuidIdParam } from "../uuid-param.ts";
import { uploadLimit } from "./upload-limit.ts";

const igsnParamSchema = z.object({ igsn: igsnSchema });

const attachmentParamsSchema = idParamSchema.extend({
  attachmentId: z.uuid(),
});

const igsnAttachmentParamsSchema = igsnParamSchema.extend({
  attachmentId: z.uuid(),
});

export const validateIdParam = validateUuidIdParam("Invalid sample id");

// A malformed IGSN can match no sample; reject it up front rather than 500 on
// the query. Only published samples carry an IGSN, so this is the public lookup.
export const validateIgsnParam = validator("param", (value, c) => {
  const parsed = igsnParamSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid IGSN" }, 400);
  }
  return parsed.data;
});

export const validateListQuery = validator("query", (value, c) => {
  const parsed = listSamplesQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});

export const validateCreateSampleBody = validator("json", (value, c) => {
  const parsed = createSampleSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid sample" }, 400);
  }
  // The payload lists the attachments to keep and `reconcile` only keeps or
  // drops rows, so its length bounds the sample's resulting count: capping it
  // here blocks saving an over-limit sample, draft or published. The limit is
  // per deployment, so publishedSampleSchema (static) cannot own this check.
  if ((parsed.data.attachments?.length ?? 0) > uploadLimit) {
    return c.json({ error: "Too many attachments" }, 400);
  }
  return parsed.data;
});

export const validateAddContributorBody = validator("json", (value, c) => {
  const parsed = addContributorBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid contributor" }, 400);
  }
  return parsed.data;
});

export const validateAttachmentParams = validator("param", (value, c) => {
  const parsed = attachmentParamsSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid attachment id" }, 400);
  }
  return parsed.data;
});

export const validateIgsnAttachmentParams = validator("param", (value, c) => {
  const parsed = igsnAttachmentParamsSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid attachment id" }, 400);
  }
  return parsed.data;
});

// Multipart upload: the domain schema caps the size before any byte reaches
// storage; any file type is accepted (downloads never render inline).
export const validateAttachmentUpload = validator("form", (value, c) => {
  const parsed = uploadSampleAttachmentSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid attachment" }, 400);
  }
  return parsed.data;
});
