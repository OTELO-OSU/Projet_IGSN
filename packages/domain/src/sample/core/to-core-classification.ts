import type { Sample } from "../sample.ts";
import type {
  CoreClassification,
  CoreContextCategory,
} from "./core-classification-schema.ts";

import { materialPathSchema } from "../material/classification.ts";
import { natureSchema } from "../nature.ts";
import { sampleTypeSchema } from "../type/vocabulary.ts";
import { toConcept } from "./concept.ts";
import { optionalConcept } from "./core-optional.ts";

export function toCoreClassification(sample: Sample): CoreClassification {
  const material = materialPathSchema.parse(sample.material);
  const context = sample.scientificContext;
  const collection =
    context?.provenanceStatus === "collection_specimen" ? context : null;
  const scientific = <I extends string, N extends string>(
    id: I | null | undefined,
    notation: N,
  ) => (id == null ? undefined : toConcept("scientificContext", id, notation));
  const contextCategories: CoreContextCategory[] = [
    toConcept("material", material),
    optionalConcept("texture", sample.texture),
    optionalConcept("metamorphic-facies", sample.metamorphicFacies),
    optionalConcept("metamorphic-fabric", sample.metamorphicFabric),
    optionalConcept(
      "physiographic-environment",
      sample.physiographicEnvironment,
    ),
    optionalConcept("resource-type", sample.resourceType),
    optionalConcept("geologicalContext", sample.geologicalContextDescription),
    scientific(context?.provenanceStatus, "provenance-status"),
    scientific(collection?.collectionOrigin, "collection-origin"),
    scientific(
      collection?.collectionContextDescription,
      "collection-context-description",
    ),
  ].filter((concept) => concept != null);

  return {
    natureOfSample: toConcept(
      "nature-of-sample",
      natureSchema.parse(sample.nature),
    ),
    sampleObjectTypes: [
      toConcept("sample-type", sampleTypeSchema.parse(sample.type)),
    ],
    materialCategories: [
      toConcept("material", material.split(".").slice(0, 2).join(".")),
    ],
    contextCategories,
  };
}
