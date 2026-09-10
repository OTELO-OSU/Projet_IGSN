import { z } from "zod";

import type { User } from "../../user/model.ts";
import type { SampleAttachment } from "../attachment/model.ts";
import type { SampleRelation } from "../relation/model.ts";
import type { Sample } from "../sample.ts";

import { canPublishSamples } from "../../user/can-publish-samples.ts";
import { DEFAULT_UPLOAD_LIMIT } from "../attachment/attachment-validator.ts";
import { allowsLocation } from "../location/allows-location.ts";
import { requiresLocation } from "../location/requires-location.ts";
import { verticalValues } from "../location/vertical-values.ts";
import { MATERIAL_PATHS } from "../material/classification.ts";
import { isMaterialComplete } from "../material/is-complete.ts";
import { isSyntheticMaterial } from "../synthetic-details/is-synthetic-material.ts";
import { needsStartingMaterialComposition } from "../synthetic-details/needs-starting-material-composition.ts";
import { isSampleTypeComplete } from "../type/is-complete.ts";
import { SAMPLE_TYPES } from "../type/vocabulary.ts";

export const publishBlockerSchema = z.enum([
  "nature_missing",
  "type_missing",
  "type_incomplete",
  "material_missing",
  "material_incomplete",
  "location_position_missing",
  "collection_date_missing",
  "numeric_age_unit_missing",
  "numeric_age_reference_missing",
  "numeric_age_range_incomplete",
  "geological_age_range_incomplete",
  "vertical_position_incomplete",
  "existence_status_missing",
  "availability_status_missing",
  "scientific_context_missing",
  "collector_name_missing",
  "collection_curator_missing",
  "collection_origin_missing",
  "synthetic_starting_material_missing",
  "synthetic_starting_material_composition_missing",
  "synthetic_final_product_missing",
  "synthetic_synthesis_date_missing",
  "synthetic_operator_name_missing",
  "relation_resource_type_missing",
  "attachment_metadata_missing",
  "attachment_limit_exceeded",
  "user_not_verified",
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

export type PublishableFields = Pick<
  Sample,
  | "nature"
  | "type"
  | "material"
  | "location"
  | "description"
  | "age"
  | "existenceStatus"
  | "availabilityStatus"
  | "scientificContext"
  | "syntheticDetails"
> & {
  relations: readonly Partial<Pick<SampleRelation, "targetResourceType">>[];
};

export function toPublishableFields(
  sample: Partial<PublishableFields>,
): PublishableFields {
  return {
    nature: sample.nature ?? null,
    type: sample.type ?? null,
    material: sample.material ?? null,
    location: sample.location ?? null,
    description: sample.description ?? null,
    age: sample.age ?? null,
    existenceStatus: sample.existenceStatus ?? null,
    availabilityStatus: sample.availabilityStatus ?? null,
    scientificContext: sample.scientificContext ?? null,
    syntheticDetails: sample.syntheticDetails ?? null,
    relations: sample.relations ?? [],
  };
}

export function samplePublishBlockers(
  sample: PublishableFields & {
    attachments?: readonly Pick<
      SampleAttachment,
      "targetResourceType" | "title" | "description"
    >[];
  },
  uploadLimit: number = DEFAULT_UPLOAD_LIMIT,
  publisher?: Pick<User, "status" | "superAdmin">,
): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];

  if (sample.nature === null) {
    blockers.push("nature_missing");
  }

  if (sample.type === null) {
    blockers.push("type_missing");
  } else if (
    !SAMPLE_TYPES.includes(sample.type) ||
    !isSampleTypeComplete(sample.type)
  ) {
    blockers.push("type_incomplete");
  }

  const materialComplete =
    sample.material !== null &&
    MATERIAL_PATHS.includes(sample.material) &&
    isMaterialComplete(sample.material);
  if (sample.material === null) {
    blockers.push("material_missing");
  } else if (!materialComplete) {
    blockers.push("material_incomplete");
  }

  if (
    materialComplete &&
    allowsLocation(sample.material) &&
    requiresLocation(sample.scientificContext?.provenanceStatus) &&
    !sample.location?.position
  ) {
    blockers.push("location_position_missing");
  }

  if (sample.description?.collectionDate == null) {
    blockers.push("collection_date_missing");
  }

  const age = sample.age;
  const hasNumericValue =
    age != null && (age.numericAgeMin != null || age.numericAgeMax != null);
  if (hasNumericValue && age.numericAgeUnit === null) {
    blockers.push("numeric_age_unit_missing");
  }

  // An age in annum is a point on a calendar, so it needs a reference (CE/BCE/
  // BP/cal BP) before publishing; other units are magnitudes and carry none.
  if (
    hasNumericValue &&
    age.numericAgeUnit === "a" &&
    age.numericAgeYearsUnit === null
  ) {
    blockers.push("numeric_age_reference_missing");
  }

  if (age != null) {
    if ((age.numericAgeMin != null) !== (age.numericAgeMax != null)) {
      blockers.push("numeric_age_range_incomplete");
    }
    if ((age.geologicalAgeMin != null) !== (age.geologicalAgeMax != null)) {
      blockers.push("geological_age_range_incomplete");
    }
  }

  const position = sample.location?.position ?? null;
  if (position?.vertical != null) {
    const { reference } = position.vertical;
    if (
      reference == null ||
      verticalValues(position).some((value) => value == null)
    ) {
      blockers.push("vertical_position_incomplete");
    }
  }

  if (sample.existenceStatus == null) {
    blockers.push("existence_status_missing");
  }

  if (sample.availabilityStatus == null) {
    blockers.push("availability_status_missing");
  }

  const context = sample.scientificContext;
  if (context == null) {
    blockers.push("scientific_context_missing");
  } else if (context.provenanceStatus === "field_sample") {
    if (context.collectorName == null) blockers.push("collector_name_missing");
  } else {
    if (context.collectionCurator == null)
      blockers.push("collection_curator_missing");
    if (context.collectionOrigin == null)
      blockers.push("collection_origin_missing");
  }

  if (materialComplete && isSyntheticMaterial(sample.material)) {
    const details = sample.syntheticDetails ?? {};
    const nature = details.startingMaterial;
    if (nature == null) {
      blockers.push("synthetic_starting_material_missing");
    }
    if (
      needsStartingMaterialComposition(nature) &&
      details.startingMaterialComposition == null
    ) {
      blockers.push("synthetic_starting_material_composition_missing");
    }
    if (details.finalProduct == null) {
      blockers.push("synthetic_final_product_missing");
    }
    if (details.synthesisDate == null) {
      blockers.push("synthetic_synthesis_date_missing");
    }
    if (details.operatorName == null) {
      blockers.push("synthetic_operator_name_missing");
    }
  }

  if (
    sample.relations.some((relation) => relation.targetResourceType == null)
  ) {
    blockers.push("relation_resource_type_missing");
  }

  if (
    sample.attachments?.some(
      (attachment) =>
        attachment.targetResourceType == null ||
        attachment.title == null ||
        attachment.description == null,
    )
  ) {
    blockers.push("attachment_metadata_missing");
  }

  if (sample.attachments != null && sample.attachments.length > uploadLimit) {
    blockers.push("attachment_limit_exceeded");
  }

  if (publisher && !canPublishSamples(publisher)) {
    blockers.push("user_not_verified");
  }

  return blockers;
}
