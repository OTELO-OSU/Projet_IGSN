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
  [...RELATION_TARGET_RESOURCE_TYPES, "physical_object"],
  toPascalCase,
);
export const coreIdentifierType = coreEnum(
  IDENTIFIER_TYPES,
  (type) => identifierTypeLabel[type],
);

export const PARENT_RELATION_TYPE = coreRelationType.toCore("is_derived_from");

export const coreTitleSchema = z.strictObject({
  value: freeTextSchema.meta({ description: "Name of the titled resource." }),
  titleType: z
    .literal("Main")
    .meta({ description: "Kind of title, always the main one." }),
});

export const coreRelationSchema = z.strictObject({
  relationType: coreRelationType.schema.meta({
    description:
      "How this sample relates to the target resource, IsDerivedFrom naming a parent sample.",
  }),
  targetIdentifier: z
    .strictObject({
      value: z.string().trim().min(1).meta({
        description:
          "The identifier itself, the parent IGSN on an IsDerivedFrom relation.",
      }),
      identifierType: coreIdentifierType.schema.meta({
        description:
          "Kind of identifier the value is written as, DOI for a minted IGSN and IGSN for a legacy handle.",
      }),
    })
    .meta({ description: "Identifier of the related resource." }),
  targetURI: z.url().optional().meta({
    description:
      "Navigable form of the identifier, for a DOI or a URL only; emit only.",
  }),
  targetTitles: z.array(coreTitleSchema).max(1).optional().meta({
    description: "Name of the related resource, one title at most.",
  }),
  targetResourceType: coreTargetResourceType.schema.meta({
    description:
      "Kind of resource the relation points at, PhysicalObject for a parent sample.",
  }),
  relatedMetadataScheme: freeTextSchema
    .meta({
      description:
        "Metadata scheme the target follows, accepted on a HasMetadata relation alone.",
    })
    .optional(),
  schemeURI: z
    .url()
    .meta({ description: "URI of that metadata scheme." })
    .optional(),
  schemeType: freeTextSchema
    .meta({ description: "Format of that metadata scheme." })
    .optional(),
  description: freeTextSchema
    .meta({ description: "Free-text description of the related resource." })
    .optional(),
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
  id: z.uuid().meta({
    description:
      "Identifier of the manual group, the value the sample is attached by.",
  }),
  name: manualGroupNameSchema.meta({
    description: "Name of the manual group; ignored on input.",
  }),
});
