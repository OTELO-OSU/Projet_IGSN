import { z } from "zod";

import { organizationRorSchema } from "../../institutional-group/organization.ts";
import { orcidSchema } from "../../user/orcid.ts";
import { freeTextSchema } from "../free-text.ts";
import { collectionOriginSchema } from "./collection-origin.ts";

const uniqueRorArraySchema = (code: string) =>
  z
    .array(organizationRorSchema)
    .min(1)
    .refine((rors) => new Set(rors).size === rors.length, { params: { code } })
    .nullish();

const recentCollectionSchema = z.object({
  provenanceStatus: z.literal("recent_collection"),
  funderOrganizations: uniqueRorArraySchema("funder_organizations_duplicate"),
  researchProgramName: freeTextSchema.nullish(),
  chiefScientist: freeTextSchema.nullish(),
  chiefScientistOrcid: orcidSchema.nullish(),
  hostInstitution: uniqueRorArraySchema("host_institution_duplicate"),
  collectorName: freeTextSchema.nullish(),
  collectorOrcid: orcidSchema.nullish(),
  researchCampaign: freeTextSchema.nullish(),
  funding: freeTextSchema.nullish(),
  researchProgramDescription: freeTextSchema.nullish(),
  fieldName: freeTextSchema.nullish(),
  missionDescription: freeTextSchema.nullish(),
});

const historicalSpecimenSchema = z.object({
  provenanceStatus: z.literal("historical_specimen"),
  collectionCurator: freeTextSchema.nullish(),
  collectionOrigin: collectionOriginSchema.nullish(),
  collectorName: freeTextSchema.nullish(),
  collectionContextDescription: freeTextSchema.nullish(),
});

export const scientificContextSchema = z.discriminatedUnion(
  "provenanceStatus",
  [recentCollectionSchema, historicalSpecimenSchema],
);

export type ScientificContext = z.infer<typeof scientificContextSchema>;
