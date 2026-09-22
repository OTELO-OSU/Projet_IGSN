import { z } from "zod";

import { organizationRorSchema } from "../../institutional-group/organization.ts";
import { orcidSchema } from "../../user/orcid.ts";
import { sampleAdditionalRoleSchema } from "../additional-role/model.ts";
import { checkContactLinks } from "../contact-link.ts";
import { freeTextSchema } from "../free-text.ts";
import { collectionOriginSchema } from "./collection-origin.ts";

export const uniqueRorArraySchema = (code: string) =>
  z
    .array(organizationRorSchema)
    .min(1)
    .refine((rors) => new Set(rors).size === rors.length, { params: { code } })
    .nullish();

const fieldSampleSchema = z.object({
  provenanceStatus: z.literal("field_sample"),
  funderOrganizations: uniqueRorArraySchema("funder_organizations_duplicate"),
  researchProgramName: freeTextSchema.nullish(),
  chiefScientistUserId: z.uuid().nullish(),
  chiefScientistFirstname: freeTextSchema.nullish(),
  chiefScientistLastname: freeTextSchema.nullish(),
  chiefScientistOrcid: orcidSchema.nullish(),
  hostInstitution: uniqueRorArraySchema("host_institution_duplicate"),
  collectorUserId: z.uuid().nullish(),
  collectorFirstname: freeTextSchema.nullish(),
  collectorLastname: freeTextSchema.nullish(),
  collectorOrcid: orcidSchema.nullish(),
  researchCampaign: freeTextSchema.nullish(),
  funding: freeTextSchema.nullish(),
  researchProgramDescription: freeTextSchema.nullish(),
  fieldName: freeTextSchema.nullish(),
  missionDescription: freeTextSchema.nullish(),
  additionalRoles: z.array(sampleAdditionalRoleSchema).default([]),
});

const collectionSpecimenSchema = z.object({
  provenanceStatus: z.literal("collection_specimen"),
  collectionCuratorUserId: z.uuid().nullish(),
  collectionCuratorFirstname: freeTextSchema.nullish(),
  collectionCuratorLastname: freeTextSchema.nullish(),
  collectionOrigin: collectionOriginSchema.nullish(),
  collectorUserId: z.uuid().nullish(),
  collectorFirstname: freeTextSchema.nullish(),
  collectorLastname: freeTextSchema.nullish(),
  collectionContextDescription: freeTextSchema.nullish(),
});

export const scientificContextSchema = z.discriminatedUnion(
  "provenanceStatus",
  [fieldSampleSchema, collectionSpecimenSchema],
);

export type ScientificContext = z.infer<typeof scientificContextSchema>;

export const createScientificContextSchema =
  scientificContextSchema.superRefine(checkContactLinks);
