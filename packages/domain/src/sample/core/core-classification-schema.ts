import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { geomorphologicalEnvironmentSchema } from "../geomorphological-environment/vocabulary.ts";
import { materialPathSchema } from "../material/classification.ts";
import { metamorphicFabricSchema } from "../metamorphic-fabric/vocabulary.ts";
import { metamorphicFaciesSchema } from "../metamorphic-facies/vocabulary.ts";
import { natureSchema } from "../nature.ts";
import { isPathAtOrUnder } from "../path/is-at-or-under.ts";
import { resourceTypeSchema } from "../resource-type/vocabulary.ts";
import { collectionOriginSchema } from "../scientific-context/collection-origin.ts";
import { PROVENANCE_STATUSES } from "../scientific-context/provenance-status.ts";
import { textureSchema } from "../texture/vocabulary.ts";
import { sampleTypeSchema } from "../type/vocabulary.ts";
import { conceptSchema, conceptShape } from "./concept.ts";

const scientificContextConceptSchema = <N extends string, T extends z.ZodType>(
  notation: N,
  id: T,
) =>
  z.strictObject({
    id,
    ...conceptShape("scientificContext"),
    notation: z.literal(notation),
  });

const coreContextCategorySchema = z.discriminatedUnion("schemeName", [
  conceptSchema("material", materialPathSchema),
  conceptSchema("texture", textureSchema),
  conceptSchema("metamorphic-facies", metamorphicFaciesSchema),
  conceptSchema("metamorphic-fabric", metamorphicFabricSchema),
  conceptSchema("geomorphologicalContext", geomorphologicalEnvironmentSchema),
  conceptSchema("resource-type", resourceTypeSchema),
  conceptSchema("geologicalContext", freeTextSchema),
  z.discriminatedUnion("notation", [
    scientificContextConceptSchema(
      "provenance-status",
      z.enum(PROVENANCE_STATUSES),
    ),
    scientificContextConceptSchema("collection-origin", collectionOriginSchema),
    scientificContextConceptSchema(
      "collection-context-description",
      freeTextSchema,
    ),
  ]),
]);

export type CoreContextCategory = z.infer<typeof coreContextCategorySchema>;

export const coreClassificationSchema = z
  .strictObject({
    natureOfSample: conceptSchema("nature-of-sample", natureSchema),
    sampleObjectTypes: z
      .array(conceptSchema("sample-type", sampleTypeSchema))
      .length(1),
    materialCategories: z
      .array(conceptSchema("material", materialPathSchema))
      .length(1),
    contextCategories: z.array(coreContextCategorySchema).min(1),
  })
  .superRefine((classification, ctx) => {
    const seen = new Set<string>();
    for (const [index, concept] of classification.contextCategories.entries()) {
      const key = `${concept.schemeName}/${concept.notation ?? ""}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["contextCategories", index],
          message: "a scheme and notation pair carries one concept at most",
        });
      }
      seen.add(key);
    }

    const material = classification.contextCategories.find(
      (concept) => concept.schemeName === "otelo:material",
    );
    const headMaterial = classification.materialCategories[0]?.id ?? "";
    if (material == null || !isPathAtOrUnder(material.id, headMaterial)) {
      ctx.addIssue({
        code: "custom",
        path: ["contextCategories"],
        message: "the material path must extend the head material",
      });
    }

    if (!seen.has("otelo:scientificContext/provenance-status")) {
      ctx.addIssue({
        code: "custom",
        path: ["contextCategories"],
        message: "a published sample carries its provenance status",
      });
    }
  });

export type CoreClassification = z.infer<typeof coreClassificationSchema>;
