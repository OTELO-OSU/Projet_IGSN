import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

import {
  composeLocation,
  type LocationDraft,
} from "#/samples/compose-location.ts";

// The sample form's flat draft, as held by the form store.
export type SampleDraft = {
  name: string | undefined;
  nature: CreateSample["nature"] | "";
  typePath: string[];
  materialPath: string[];
  texture: NonNullable<CreateSample["texture"]> | "";
  metamorphicFacies: NonNullable<CreateSample["metamorphicFacies"]> | "";
  collectionMethodPath: string[];
  collectionMethodDescription: string | null | undefined;
  specificName: string | null | undefined;
  location: LocationDraft;
};

const composeCreateSample = (draft: SampleDraft) => ({
  name: draft.name,
  nature: draft.nature,
  type: composeHierarchyValue(draft.typePath),
  material: composeHierarchyValue(draft.materialPath),
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
  location: composeLocation(draft.location),
});

// The domain schema the API enforces, applied to the form draft: preprocess
// composes the flat draft into the domain shape first, so the form and the
// API share a single source of truth for validation.
export const sampleDraftSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  createSampleSchema,
);
