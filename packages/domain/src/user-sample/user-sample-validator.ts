import { z } from "zod";

import { userStatusSchema } from "../user/model.ts";
import { userIdentitySchema } from "../user/user-validator.ts";
import { userSampleRoleSchema } from "./model.ts";

export const collaboratorRoleSchema = userSampleRoleSchema.exclude(["owner"]);

export type CollaboratorRole = z.infer<typeof collaboratorRoleSchema>;

export const addCollaboratorBodySchema = z.strictObject({
  userId: z.uuid(),
  role: collaboratorRoleSchema,
});

export type AddCollaboratorBody = z.infer<typeof addCollaboratorBodySchema>;

export const sampleCollaboratorSchema = userIdentitySchema.extend({
  role: userSampleRoleSchema,
  status: userStatusSchema,
});

export type SampleCollaborator = z.infer<typeof sampleCollaboratorSchema>;

export const sampleCollaboratorsResponseSchema = z.object({
  data: z.array(sampleCollaboratorSchema),
});

export type SampleCollaboratorsResponse = z.infer<
  typeof sampleCollaboratorsResponseSchema
>;
