import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { materialPathSchema } from "../material/classification.ts";
import { metamorphicFabricSchema } from "../metamorphic-fabric/vocabulary.ts";
import { metamorphicFaciesSchema } from "../metamorphic-facies/vocabulary.ts";
import { natureSchema } from "../nature.ts";
import { isPathAtOrUnder } from "../path/is-at-or-under.ts";
import { physiographicEnvironmentSchema } from "../physiographic-environment/vocabulary.ts";
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
    id: id.meta({
      description:
        "Our code, or the free text, for the scientific-context entry this notation names.",
    }),
    ...conceptShape("scientificContext"),
    notation: z.literal(notation).meta({
      description: "Which scientific-context entry this concept carries.",
    }),
  });

const coreContextCategorySchema = z.discriminatedUnion("schemeName", [
  conceptSchema("material", materialPathSchema),
  conceptSchema("texture", textureSchema),
  conceptSchema("metamorphic-facies", metamorphicFaciesSchema),
  conceptSchema("metamorphic-fabric", metamorphicFabricSchema),
  conceptSchema("physiographicEnvironment", physiographicEnvironmentSchema),
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
    natureOfSample: conceptSchema("nature-of-sample", natureSchema).meta({
      description:
        "What the sample physically is; required on a published sample.",
    }),
    sampleObjectTypes: z
      .array(conceptSchema("sample-type", sampleTypeSchema))
      .length(1)
      .meta({
        description:
          "Type of object the sample is, exactly one concept; required on a published sample.",
      }),
    materialCategories: z
      .array(conceptSchema("material", materialPathSchema))
      .length(1)
      .meta({
        description:
          "Head material of the sample, the first level of its material path; required on a published sample.",
      }),
    contextCategories: z.array(coreContextCategorySchema).min(1).meta({
      description:
        "Scientific context of the sample: its full material path and its provenance status, both required, plus its texture, metamorphic facies and fabric, physiographic environment, resource type, geological context, collection origin and collection context when set.",
    }),
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
