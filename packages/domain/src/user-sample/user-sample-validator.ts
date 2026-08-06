import { z } from "zod";

import { userIdentitySchema } from "../user/user-validator.ts";
import { userSampleRoleSchema } from "./model.ts";

export const addContributorBodySchema = z.strictObject({
  userId: z.uuid(),
});

export type AddContributorBody = z.infer<typeof addContributorBodySchema>;

export const sampleCollaboratorSchema = userIdentitySchema.extend({
  role: userSampleRoleSchema,
});

export type SampleCollaborator = z.infer<typeof sampleCollaboratorSchema>;

export const sampleCollaboratorsResponseSchema = z.object({
  data: z.array(sampleCollaboratorSchema),
});

export type SampleCollaboratorsResponse = z.infer<
  typeof sampleCollaboratorsResponseSchema
>;
