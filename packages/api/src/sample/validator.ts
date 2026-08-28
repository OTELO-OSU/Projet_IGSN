import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { uploadSampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import {
  contactSampleOwnerBodySchema,
  listSamplesQuerySchema,
  setSampleStatusBodySchema,
  updateSampleBodySchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { addCollaboratorBodySchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { validator } from "hono/validator";
import { z } from "zod";

import { idParamSchema, validateUuidIdParam } from "../uuid-param.ts";
import { uploadLimit } from "./upload-limit.ts";

const igsnParamSchema = z.object({ igsn: igsnSchema });

const attachmentParamsSchema = idParamSchema.extend({
  attachmentId: z.uuid(),
});

const collaboratorParamsSchema = idParamSchema.extend({
  userId: z.uuid(),
});

const igsnAttachmentParamsSchema = igsnParamSchema.extend({
  attachmentId: z.uuid(),
});

export const validateIdParam = validateUuidIdParam("Invalid sample id");

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

function sampleBodyValidator<
  S extends typeof createSampleSchema | typeof updateSampleBodySchema,
>(schema: S) {
  return validator("json", (value, c) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: "Invalid sample" }, 400);
    }
    if ((parsed.data.attachments?.length ?? 0) > uploadLimit) {
      return c.json({ error: "Too many attachments" }, 400);
    }
    return parsed.data as z.infer<S>;
  });
}

export const validateCreateSampleBody = sampleBodyValidator(createSampleSchema);

export const validateUpdateSampleBody = sampleBodyValidator(
  updateSampleBodySchema,
);

export const validateContactBody = validator("json", (value, c) => {
  const parsed = contactSampleOwnerBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid contact request" }, 400);
  }
  return parsed.data;
});

/** Parsed by hand from `?status=` so the hc client keeps its bodiless, query-less `publish.$post` signature. */
export const publishStatusSchema =
  setSampleStatusBodySchema.shape.status.default("published");

export const validateStatusBody = validator("json", (value, c) => {
  const parsed = setSampleStatusBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid sample status" }, 400);
  }
  return parsed.data;
});

export const validateAddCollaboratorBody = validator("json", (value, c) => {
  const parsed = addCollaboratorBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid collaborator" }, 400);
  }
  return parsed.data;
});

export const validateCollaboratorParams = validator("param", (value, c) => {
  const parsed = collaboratorParamsSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid collaborator id" }, 400);
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

export const validateAttachmentUpload = validator("form", (value, c) => {
  const parsed = uploadSampleAttachmentSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid attachment" }, 400);
  }
  return parsed.data;
});
