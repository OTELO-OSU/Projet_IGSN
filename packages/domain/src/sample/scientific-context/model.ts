import { z } from "zod";

import { orcidSchema } from "../../user/orcid.ts";
import { freeTextSchema } from "../free-text.ts";
import { collectionOriginSchema } from "./collection-origin.ts";
import { organizationRorSchema } from "./organization.ts";

// Every leaf is optional (a draft may hold only the status); the mandatory ones
// surface as publish blockers, not schema errors (see sample-publish-blockers).

const recentCollectionSchema = z
  .object({
    provenanceStatus: z.literal("recent_collection"),
    funderOrganization: organizationRorSchema.nullish(),
    researchProgramName: freeTextSchema.nullish(),
    researchProgramChief: freeTextSchema.nullish(),
    researchProgramChiefOrcid: orcidSchema.nullish(),
    researchStructure: z.array(organizationRorSchema).min(1).nullish(),
    collectorName: freeTextSchema.nullish(),
    collectorOrcid: orcidSchema.nullish(),
    researchCampaign: freeTextSchema.nullish(),
    funding: freeTextSchema.nullish(),
    researchProgramDescription: freeTextSchema.nullish(),
    fieldName: freeTextSchema.nullish(),
    missionDescription: freeTextSchema.nullish(),
  })
  .superRefine((context, ctx) => {
    const structures = context.researchStructure;
    if (structures != null && new Set(structures).size !== structures.length) {
      ctx.addIssue({
        code: "custom",
        path: ["researchStructure"],
        message: "research structures must be unique",
        params: { code: "research_structure_duplicate" },
      });
    }
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
