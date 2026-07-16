import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { locationRequirement } from "@projet-igsn/domain/sample/location/location-requirement";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

import {
  composeLocation,
  type LocationDraft,
  toLocationDraft,
} from "#/samples/compose-location.ts";

// The sample form's flat draft, as held by the form store.
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
});

const composeCreateSample = (draft: SampleDraft) => {
  const material = composeHierarchyValue(draft.materialPath);
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
    // The location tab hides when the material forbids a location (synthetic,
    // ADR 0014), so a location entered before the switch is a hidden leftover:
    // drop it rather than let the schema pin an error on fields the user
    // cannot see (an unfixable, silent save failure).
    location:
      locationRequirement(material) === "forbidden"
        ? null
        : composeLocation(draft.location),
  };
};

// The domain schema the API enforces, applied to the form draft: preprocess
// composes the flat draft into the domain shape first, so the form and the
// API share a single source of truth for validation.
export const sampleDraftSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  createSampleSchema,
);
