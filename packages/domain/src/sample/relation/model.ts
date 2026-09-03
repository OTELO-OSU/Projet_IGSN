import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import {
  identifierTypeSchema,
  type IdentifierType,
} from "./identifier-type.ts";
import { isDoi, isNavigableUrl } from "./relation-target-href.ts";
import {
  hasMetadataScheme,
  relationTypeSchema,
  type RelationType,
} from "./relation-type.ts";
import { relationTargetResourceTypeSchema } from "./target-resource-type.ts";

type RelationCheck = {
  relationType: RelationType;
  identifierType: IdentifierType;
  identifier: string;
  relatedMetadataScheme?: string | null;
  schemeURI?: string | null;
  schemeType?: string | null;
};

const checkRelation = (value: RelationCheck, ctx: z.RefinementCtx) => {
  if (value.identifierType === "doi" && !isDoi(value.identifier)) {
    ctx.addIssue({
      code: "custom",
      path: ["identifier"],
      message: "must be a DOI",
      params: { code: "relation_identifier_doi" },
    });
  }
  if (value.identifierType === "url" && !isNavigableUrl(value.identifier)) {
    ctx.addIssue({
      code: "custom",
      path: ["identifier"],
      message: "must be a valid URL",
      params: { code: "relation_identifier_url" },
    });
  }
  if (
    value.identifierType === "igsn" &&
    !igsnSchema.safeParse(value.identifier).success
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["identifier"],
      message: "must be a valid IGSN",
      params: { code: "relation_identifier_igsn" },
    });
  }
  if (
    !hasMetadataScheme(value.relationType) &&
    (value.relatedMetadataScheme || value.schemeURI || value.schemeType)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["relatedMetadataScheme"],
      message: "only allowed with has_metadata",
      params: { code: "relation_scheme_without_has_metadata" },
    });
  }
};

export const sampleRelationSchema = z
  .object({
    id: z.uuid(),
    relationType: relationTypeSchema,
    identifierType: identifierTypeSchema,
    identifier: z.string().trim().min(1),
    targetTitle: freeTextSchema,
    targetResourceType: relationTargetResourceTypeSchema.nullable(),
    relationTypeInformation: freeTextSchema.nullable(),
    relatedMetadataScheme: freeTextSchema.nullable(),
    schemeURI: z.url().nullable(),
    schemeType: freeTextSchema.nullable(),
    description: freeTextSchema.nullable(),
  })
  .superRefine(checkRelation);

export type SampleRelation = z.infer<typeof sampleRelationSchema>;

export const createSampleRelationSchema = z
  .strictObject({
    relationType: relationTypeSchema,
    identifierType: identifierTypeSchema,
    identifier: z.string().trim().min(1),
    targetTitle: freeTextSchema,
    targetResourceType: relationTargetResourceTypeSchema.nullish(),
    relationTypeInformation: freeTextSchema.nullish(),
    relatedMetadataScheme: freeTextSchema.nullish(),
    schemeURI: z.url().nullish(),
    schemeType: freeTextSchema.nullish(),
    description: freeTextSchema.nullish(),
  })
  .superRefine(checkRelation);

export type CreateSampleRelation = z.infer<typeof createSampleRelationSchema>;
