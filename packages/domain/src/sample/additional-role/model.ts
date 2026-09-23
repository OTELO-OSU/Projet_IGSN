import { z } from "zod";

import { orcidSchema } from "../../user/orcid.ts";
import { freeTextSchema } from "../free-text.ts";
import { additionalRoleSchema } from "./role.ts";

export const sampleAdditionalRoleSchema = z.object({
  role: additionalRoleSchema,
  personUserId: z.uuid().nullish(),
  personFirstname: freeTextSchema.nullish(),
  personLastname: freeTextSchema.nullish(),
  personOrcid: orcidSchema.nullish(),
});

export type SampleAdditionalRole = z.infer<typeof sampleAdditionalRoleSchema>;

export const createSampleAdditionalRoleSchema = sampleAdditionalRoleSchema.omit(
  { personOrcid: true },
);
