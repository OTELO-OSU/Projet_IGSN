import type { ISamplesConcept, ISamplesVocabulary } from "./isamples-schema.ts";

import {
  MATERIAL_VOCABULARY,
  OBJECT_TYPE_VOCABULARY,
  SAMPLED_FEATURE_VOCABULARY,
} from "./isamples-schema.ts";

type MaterialHead =
  | "rock"
  | "sediment"
  | "mineral"
  | "synthetic_rock_mineral"
  | "extraterrestrial_rock";

const concept = (
  { base, schemeName, schemeUri }: ISamplesVocabulary,
  slug: string,
  label: string,
): ISamplesConcept => ({
  label,
  pid: `${base}${slug}`,
  scheme_name: schemeName,
  scheme_uri: schemeUri,
});

const MATERIAL_CONCEPTS: Record<MaterialHead, ISamplesConcept> = {
  rock: concept(MATERIAL_VOCABULARY, "rock", "Rock"),
  sediment: concept(MATERIAL_VOCABULARY, "sediment", "Sediment"),
  mineral: concept(MATERIAL_VOCABULARY, "mineral", "Mineral"),
  synthetic_rock_mineral: concept(
    MATERIAL_VOCABULARY,
    "particulate",
    "Particulate",
  ),
  extraterrestrial_rock: concept(
    MATERIAL_VOCABULARY,
    "particulate",
    "Particulate",
  ),
};

const EARTH_INTERIOR = concept(
  SAMPLED_FEATURE_VOCABULARY,
  "earthinterior",
  "Earth interior",
);

const EXTRATERRESTRIAL_ENVIRONMENT = concept(
  SAMPLED_FEATURE_VOCABULARY,
  "extraterrestrialenvironment",
  "Extraterrestrial environment",
);

export const SOLID_MATERIAL_SAMPLE = concept(
  OBJECT_TYPE_VOCABULARY,
  "solidmaterialsample",
  "Solid material sample",
);

export function toISamplesMaterialCategory(head: string): ISamplesConcept {
  return MATERIAL_CONCEPTS[head as MaterialHead];
}

export function toISamplesContextCategory(head: string): ISamplesConcept {
  return head === "extraterrestrial_rock"
    ? EXTRATERRESTRIAL_ENVIRONMENT
    : EARTH_INTERIOR;
}
