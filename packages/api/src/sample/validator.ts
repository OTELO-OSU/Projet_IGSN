import { igsnSuffixSchema } from "@projet-igsn/domain/igsn/model";
import { uploadSampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { validator } from "hono/validator";
import { z } from "zod";

const idParamSchema = z.object({ id: z.uuid() });

const igsnParamSchema = z.object({ igsn: igsnSuffixSchema });

const attachmentParamsSchema = idParamSchema.extend({
  attachmentId: z.uuid(),
});

const igsnAttachmentParamsSchema = igsnParamSchema.extend({
  attachmentId: z.uuid(),
});

// A malformed uuid can match no sample, and unvalidated it would make the
// uuid-typed query throw, so reject it up front rather than 500 later.
export const validateIdParam = validator("param", (value, c) => {
  const parsed = idParamSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid sample id" }, 400);
  }
  return parsed.data;
});

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
