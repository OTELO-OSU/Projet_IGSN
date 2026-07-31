import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";
import { publishedSampleSchema as domainPublishedSampleSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

import {
  type AgeFormValues,
  ageFormValues,
  toAgeInput,
} from "#/samples/age-form.ts";
import {
  composeCondition,
  type ConditionDraft,
  toConditionDraft,
} from "#/samples/compose-condition.ts";
import {
  composeDescription,
  type DescriptionDraft,
  toDescriptionDraft,
} from "#/samples/compose-description.ts";
import {
  composeEconomicInterest,
  type EconomicInterestDraft,
  toEconomicInterestDraft,
} from "#/samples/compose-economic-interest.ts";
import {
  composeLocation,
  type LocationDraft,
  toLocationDraft,
} from "#/samples/compose-location.ts";
import {
  composeScientificContext,
  type ScientificContextDraft,
  toScientificContextDraft,
} from "#/samples/compose-scientific-context.ts";
import {
  composeSecurity,
  type SecurityDraft,
  toSecurityDraft,
} from "#/samples/compose-security.ts";

// The key only gives the row a stable React identity across removals; the
// compose step never reads it.
export type LinkDraft = { key: string; url: string; description: string };

export type SampleDraft = {
  name: string | undefined;
  nature: CreateSample["nature"] | undefined;
  typePath: string[];
  materialPath: string[];
  texture: CreateSample["texture"] | undefined;
  metamorphicFacies: CreateSample["metamorphicFacies"] | undefined;
  collectionMethodPath: string[];
  collectionMethodDescription: string | null | undefined;
  specificName: string | null | undefined;
  location: LocationDraft;
  description: DescriptionDraft;
  condition: ConditionDraft;
  security: SecurityDraft;
  scientificContext: ScientificContextDraft;
  availability: CreateSample["availability"] | undefined;
  age: AgeFormValues;
  links: LinkDraft[];
} & EconomicInterestDraft;

export const toSampleDraft = (value?: CreateSample): SampleDraft => ({
  name: value?.name,
  nature: value?.nature,
  typePath: toHierarchyPath(value?.type ?? null),
  materialPath: toHierarchyPath(value?.material ?? null),
  texture: value?.texture,
  metamorphicFacies: value?.metamorphicFacies,
  collectionMethodPath: toHierarchyPath(value?.collectionMethod ?? null),
  collectionMethodDescription: value?.collectionMethodDescription,
  specificName: value?.specificName,
  location: toLocationDraft(value?.location),
  description: toDescriptionDraft(value?.description),
  condition: toConditionDraft(value?.condition),
  security: toSecurityDraft(value?.security),
  scientificContext: toScientificContextDraft(value?.scientificContext),
  // Defaults to "exists" per the declaration flow; still required to publish.
  availability: value?.availability ?? "exists",
  age: ageFormValues(value?.age),
  links: (value?.links ?? []).map((link) => ({
    key: crypto.randomUUID(),
    url: link.url,
    description: link.description ?? "",
  })),
  ...toEconomicInterestDraft(value),
});

// A row with any content is kept as-is, so a description without its url still
// raises the schema error on the row's url field.
const composeLinks = (links: LinkDraft[]) =>
  links
    .filter((link) => link.url.trim() || link.description.trim())
    .map((link) => ({
      url: link.url.trim(),
      description: link.description.trim() || null,
    }));

const composeCreateSample = (draft: SampleDraft) => {
  const material = composeHierarchyValue(draft.materialPath);
  const description = composeDescription(draft.description);
  const condition = composeCondition(draft.condition);
  const age = toAgeInput(draft.age);
  const security = composeSecurity(draft.security);
  const scientificContext = composeScientificContext(draft.scientificContext);
  const links = composeLinks(draft.links);
  const economic = composeEconomicInterest(draft);
  return {
    name: draft.name,
    nature: draft.nature,
    type: composeHierarchyValue(draft.typePath),
    material,
    ...(draft.texture ? { texture: draft.texture } : {}),
    ...(draft.metamorphicFacies
      ? { metamorphicFacies: draft.metamorphicFacies }
      : {}),
    collectionMethod: composeHierarchyValue(draft.collectionMethodPath),
    collectionMethodDescription:
      draft.collectionMethodDescription?.trim() || null,
    specificName: draft.specificName?.trim() || null,
    // The location section hides when the material forbids a location
    // (synthetic, ADR 0014) or does not determine its requirement yet, so a
    // location entered before the switch is a hidden leftover: drop it rather
    // than let the schema pin an error on fields the user cannot see (an
    // unfixable, silent save failure).
    location: ["forbidden", "undetermined"].includes(
      locationRequirement(material),
    )
      ? null
      : composeLocation(draft.location),
    // Omitted when the whole section is empty: the API clears the description
    // columns for an absent description just like for a null one.
    ...(description ? { description } : {}),
    ...(condition ? { condition } : {}),
    ...(security ? { security } : {}),
    ...(scientificContext ? { scientificContext } : {}),
    ...(draft.availability ? { availability: draft.availability } : {}),
    ...(age ? { age } : {}),
    // Omitted when empty: the API replaces links wholesale, and an absent key
    // clears them just like an empty array.
    ...(links.length > 0 ? { links } : {}),
    ...(economic.economicInterest !== null ? economic : {}),
  };
};

export const sampleDraftSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  createSampleSchema,
);

export const publishedSampleSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  domainPublishedSampleSchema,
);
