import { z } from "zod";

import { collectionOriginSchema } from "./collection-origin.ts";
import { organizationRorSchema } from "./organization.ts";

// A sample's scientific context: who collected it, in which programme or
// collection, and how. `provenanceStatus` is the discriminant: a recent
// collection carries programme/campaign fields, a historical specimen carries
// collection/curator fields. Every leaf is optional (a draft may hold only the
// status); the mandatory ones surface as publish blockers, not schema errors
// (like material/age; see sample-publish-blockers). `sample.scientificContext`
// as a whole is nullable.
//
// Not imported from sample.ts: sample.ts imports this module, so the dependency
// must not run the other way.
const freeText = z.string().trim().min(1);

// An ORCID iD: four groups of four digits, the last digit possibly the checksum
// letter X (https://info.orcid.org/ufaqs/what-is-an-orcid-id). We check the
// shape, not the mod-11-2 checksum: enough to keep the ror.org/orcid.org links
// well-formed without hand-rolling the checksum.
const orcid = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, { message: "invalid ORCID iD" });

// Recorded before the 2020s, filled when declaring a sample: an active research
// programme, its funder, chief and collector (organizations referenced by ROR).
const recentCollectionSchema = z
  .object({
    provenanceStatus: z.literal("recent_collection"),
    funderOrganization: organizationRorSchema.nullish(),
    researchProgramName: freeText.nullish(),
    researchProgramChief: freeText.nullish(),
    researchProgramChiefOrcid: orcid.nullish(),
    // Multi-select: the chief may belong to several structures. "Not filled"
    // is null/absent, never [] (same rule as condition.storageConditions).
    researchStructure: z.array(organizationRorSchema).min(1).nullish(),
    collectorName: freeText.nullish(),
    collectorOrcid: orcid.nullish(),
    researchCampaign: freeText.nullish(),
    funding: freeText.nullish(),
    researchProgramDescription: freeText.nullish(),
    fieldName: freeText.nullish(),
    missionDescription: freeText.nullish(),
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

// A pre-existing collection or historical specimen: a curator and how the
// collection was assembled, rather than an active programme.
const historicalSpecimenSchema = z.object({
  provenanceStatus: z.literal("historical_specimen"),
  collectionCurator: freeText.nullish(),
  collectionOrigin: collectionOriginSchema.nullish(),
  collectorName: freeText.nullish(),
  collectionContextDescription: freeText.nullish(),
});

export const scientificContextSchema = z.discriminatedUnion(
  "provenanceStatus",
  [recentCollectionSchema, historicalSpecimenSchema],
);

export type ScientificContext = z.infer<typeof scientificContextSchema>;
