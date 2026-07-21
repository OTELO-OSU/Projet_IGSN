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
  composeLocation,
  type LocationDraft,
  toLocationDraft,
} from "#/samples/compose-location.ts";
import {
  composeSecurity,
  type SecurityDraft,
  toSecurityDraft,
} from "#/samples/compose-security.ts";

// The sample form's flat draft, as held by the form store. Age nests under its
// own key (like location), so the form's `age.*` paths mirror the domain shape.
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
  availability: CreateSample["availability"] | undefined;
  age: AgeFormValues;
};

// A saved (or default) sample, spread into the flat draft the form store
// holds. Used for the initial values and to reset the form after a save, so
// leftovers the save dropped (a hidden geometry's coordinates, the other
// region kind's leaf) disappear.
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
  // Defaults to "exists" per the declaration flow; still required to publish.
  availability: value?.availability ?? "exists",
  age: ageFormValues(value?.age),
});

const composeCreateSample = (draft: SampleDraft) => {
  const material = composeHierarchyValue(draft.materialPath);
  const description = composeDescription(draft.description);
  const condition = composeCondition(draft.condition);
  // Assemble the age block; omit it entirely when empty (like texture).
  const age = toAgeInput(draft.age);
  const security = composeSecurity(draft.security);
  return {
    name: draft.name,
    nature: draft.nature,
    type: composeHierarchyValue(draft.typePath),
    material,
    // Optional and only valid for an igneous branch; omit when unset.
    ...(draft.texture ? { texture: draft.texture } : {}),
    // Optional and only valid for a metamorphic material; omit when unset.
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
    // Same contract for the condition columns.
    ...(condition ? { condition } : {}),
    // Same contract for the security columns.
    ...(security ? { security } : {}),
    // Required only at publish; omit on a draft that has not answered it yet.
    ...(draft.availability ? { availability: draft.availability } : {}),
    ...(age ? { age } : {}),
  };
};

// The domain schema the API enforces, applied to the form draft: preprocess
// composes the flat draft into the domain shape first, so the form and the
// API share a single source of truth for validation.
export const sampleDraftSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  createSampleSchema,
);

// The same draft, validated against the domain's published-sample schema
// (publish blockers become field issues): one bar for a sample that is, or is
// becoming, published, like the API's PUT does for a published sample.
export const publishedSampleSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  domainPublishedSampleSchema,
);
