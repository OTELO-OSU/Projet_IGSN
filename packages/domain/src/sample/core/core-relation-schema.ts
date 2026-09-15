import { z } from "zod";

import { igsnSchema, igsnSuffixSchema } from "../../igsn/model.ts";
import { manualGroupNameSchema } from "../../manual-group/model.ts";
import { freeTextSchema } from "../free-text.ts";
import {
  IDENTIFIER_TYPES,
  identifierTypeLabel,
} from "../relation/identifier-type.ts";
import { RELATION_TYPES } from "../relation/relation-type.ts";
import { RELATION_TARGET_RESOURCE_TYPES } from "../relation/target-resource-type.ts";
import { coreEnum, toPascalCase } from "./core-enum.ts";

export const coreRelationType = coreEnum(RELATION_TYPES, toPascalCase);
export const coreTargetResourceType = coreEnum(
  RELATION_TARGET_RESOURCE_TYPES,
  toPascalCase,
);
export const coreIdentifierType = coreEnum(
  IDENTIFIER_TYPES,
  (type) => identifierTypeLabel[type],
);

export const PARENT_RELATION_TYPE = coreRelationType.toCore("is_derived_from");

export const coreTitleSchema = z.strictObject({
  value: freeTextSchema,
  titleType: z.literal("Main"),
});

export const coreRelationSchema = z.strictObject({
  relationType: coreRelationType.schema,
  targetIdentifier: z.strictObject({
    value: z.string().trim().min(1),
    identifierType: coreIdentifierType.schema,
  }),
  targetURI: z.url().optional(),
  targetTitles: z.array(coreTitleSchema).length(1),
  targetResourceType: coreTargetResourceType.schema,
  relationTypeInformation: freeTextSchema.optional(),
  relatedMetadataScheme: freeTextSchema.optional(),
  schemeURI: z.url().optional(),
  schemeType: freeTextSchema.optional(),
  description: freeTextSchema.optional(),
});

export type CoreRelation = z.infer<typeof coreRelationSchema>;

const isLegacyIgsn = (value: string): boolean =>
  igsnSchema.safeParse(value).success &&
  !igsnSuffixSchema.safeParse(value).success;

export const parentIgsnOf = (relation: CoreRelation): string | null => {
  if (relation.relationType !== PARENT_RELATION_TYPE) return null;
  const { value, identifierType } = relation.targetIdentifier;
  if (identifierType === "DOI" && igsnSuffixSchema.safeParse(value).success) {
    return value;
  }
  if (identifierType === "IGSN" && isLegacyIgsn(value)) return value;
  return null;
};

export const toParentIdentifierType = (igsn: string): string =>
  isLegacyIgsn(igsn) ? "IGSN" : "DOI";

export const coreManualGroupSchema = z.strictObject({
  id: z.uuid(),
  name: manualGroupNameSchema,
});
