import { z } from "zod";

import type { User } from "../../user/model.ts";
import type { SampleAttachment } from "../attachment/model.ts";
import type { ContactLink } from "../contact-link.ts";
import type { SampleProcessStep } from "../process-step/model.ts";
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
  "collector_firstname_missing",
  "collector_lastname_missing",
  "chief_scientist_firstname_missing",
  "chief_scientist_lastname_missing",
  "additional_role_firstname_missing",
  "additional_role_lastname_missing",
  "collection_origin_missing",
  "synthetic_starting_material_missing",
  "synthetic_starting_material_composition_missing",
  "synthetic_final_product_missing",
  "synthetic_synthesis_date_missing",
  "synthetic_operator_firstname_missing",
  "synthetic_operator_lastname_missing",
  "relation_resource_type_missing",
  "process_step_date_missing",
  "parent_not_found",
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
  processSteps: readonly Partial<Pick<SampleProcessStep, "date">>[];
  parentIds?: readonly string[];
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
    processSteps: sample.processSteps ?? [],
    parentIds: sample.parentIds ?? [],
  };
}

type NamedPerson =
  | "collector"
  | "chief_scientist"
  | "additional_role"
  | "synthetic_operator";

export type PublishRequirement = { blocker: PublishBlocker; isMet: boolean };

type PublishCheckedSample = PublishableFields & {
  attachments?: readonly Pick<SampleAttachment, "targetResourceType">[];
  parents?: readonly (Pick<Sample, "id"> | null)[];
};

const nameRequirements = (
  person: NamedPerson,
  { userId, firstname, lastname }: ContactLink,
  presence: "required" | "optional",
): PublishRequirement[] => {
  if (presence === "optional" && firstname == null && lastname == null)
    return [];
  return [
    {
      blocker: `${person}_firstname_missing`,
      isMet: userId != null || firstname != null,
    },
    {
      blocker: `${person}_lastname_missing`,
      isMet: userId != null || lastname != null,
    },
  ];
};

const fieldRequirements = (
  sample: PublishCheckedSample,
): PublishRequirement[] => {
  const requirements: PublishRequirement[] = [
    { blocker: "nature_missing", isMet: sample.nature !== null },
    {
      blocker: sample.type === null ? "type_missing" : "type_incomplete",
      isMet:
        sample.type !== null &&
        SAMPLE_TYPES.includes(sample.type) &&
        isSampleTypeComplete(sample.type),
    },
  ];

  const materialComplete =
    sample.material !== null &&
    MATERIAL_PATHS.includes(sample.material) &&
    isMaterialComplete(sample.material);
  requirements.push({
    blocker:
      sample.material === null ? "material_missing" : "material_incomplete",
    isMet: materialComplete,
  });

  const hasParent =
    (sample.parentIds?.length ?? 0) > 0 || (sample.parents?.length ?? 0) > 0;
  if (
    !hasParent &&
    materialComplete &&
    allowsLocation(sample.material) &&
    requiresLocation(sample.scientificContext?.provenanceStatus)
  ) {
    requirements.push({
      blocker: "location_position_missing",
      isMet: !!sample.location?.position,
    });
  }

  requirements.push({
    blocker: "collection_date_missing",
    isMet: sample.description?.collectionDate != null,
  });

  const age = sample.age;
  if (age != null && (age.numericAgeMin != null || age.numericAgeMax != null)) {
    requirements.push({
      blocker: "numeric_age_unit_missing",
      isMet: age.numericAgeUnit !== null,
    });
    // An age in annum is a point on a calendar, so it needs a reference
    // (CE/BCE/BP/cal BP) before publishing.
    if (age.numericAgeUnit === "a") {
      requirements.push({
        blocker: "numeric_age_reference_missing",
        isMet: age.numericAgeYearsUnit !== null,
      });
    }
    requirements.push({
      blocker: "numeric_age_range_incomplete",
      isMet: age.numericAgeMin != null && age.numericAgeMax != null,
    });
  }
  if (
    age != null &&
    (age.geologicalAgeMin != null || age.geologicalAgeMax != null)
  ) {
    requirements.push({
      blocker: "geological_age_range_incomplete",
      isMet: age.geologicalAgeMin != null && age.geologicalAgeMax != null,
    });
  }

  const position = sample.location?.position ?? null;
  if (position?.vertical != null) {
    requirements.push({
      blocker: "vertical_position_incomplete",
      isMet:
        position.vertical.reference != null &&
        verticalValues(position).every((value) => value != null),
    });
  }

  requirements.push(
    {
      blocker: "existence_status_missing",
      isMet: sample.existenceStatus != null,
    },
    {
      blocker: "availability_status_missing",
      isMet: sample.availabilityStatus != null,
    },
  );

  const context = sample.scientificContext;
  requirements.push({
    blocker: "scientific_context_missing",
    isMet: context != null,
  });
  if (context?.provenanceStatus === "field_sample") {
    requirements.push(
      ...nameRequirements(
        "collector",
        {
          userId: context.collectorUserId,
          firstname: context.collectorFirstname,
          lastname: context.collectorLastname,
        },
        "required",
      ),
      ...nameRequirements(
        "chief_scientist",
        {
          userId: context.chiefScientistUserId,
          firstname: context.chiefScientistFirstname,
          lastname: context.chiefScientistLastname,
        },
        "optional",
      ),
      ...context.additionalRoles.flatMap((role) =>
        nameRequirements(
          "additional_role",
          {
            userId: role.personUserId,
            firstname: role.personFirstname,
            lastname: role.personLastname,
          },
          "required",
        ),
      ),
    );
  } else if (context != null) {
    requirements.push(
      {
        blocker: "collection_origin_missing",
        isMet: context.collectionOrigin != null,
      },
      ...nameRequirements(
        "collector",
        {
          userId: context.collectorUserId,
          firstname: context.collectorFirstname,
          lastname: context.collectorLastname,
        },
        "optional",
      ),
    );
  }

  if (materialComplete && isSyntheticMaterial(sample.material)) {
    const details = sample.syntheticDetails ?? {};
    const nature = details.startingMaterial;
    requirements.push({
      blocker: "synthetic_starting_material_missing",
      isMet: nature != null,
    });
    if (needsStartingMaterialComposition(nature)) {
      requirements.push({
        blocker: "synthetic_starting_material_composition_missing",
        isMet: details.startingMaterialComposition != null,
      });
    }
    requirements.push(
      {
        blocker: "synthetic_final_product_missing",
        isMet: details.finalProduct != null,
      },
      {
        blocker: "synthetic_synthesis_date_missing",
        isMet: details.synthesisDate != null,
      },
      ...nameRequirements(
        "synthetic_operator",
        {
          userId: details.operatorUserId,
          firstname: details.operatorFirstname,
          lastname: details.operatorLastname,
        },
        "required",
      ),
    );
  }

  requirements.push(
    ...sample.relations.map((relation) => ({
      blocker: "relation_resource_type_missing" as const,
      isMet: relation.targetResourceType != null,
    })),
    ...sample.processSteps.map((step) => ({
      blocker: "process_step_date_missing" as const,
      isMet: step.date != null,
    })),
  );

  return requirements;
};

const attachmentRequirements = (
  sample: PublishCheckedSample,
): PublishRequirement[] =>
  (sample.attachments ?? []).map((attachment) => ({
    blocker: "attachment_metadata_missing",
    isMet: attachment.targetResourceType != null,
  }));

const unmet = (requirements: PublishRequirement[]): PublishBlocker[] =>
  requirements.filter(({ isMet }) => !isMet).map(({ blocker }) => blocker);

export function samplePublishRequirements(
  sample: PublishCheckedSample,
): PublishRequirement[] {
  return [...fieldRequirements(sample), ...attachmentRequirements(sample)];
}

export function samplePublishBlockers(
  sample: PublishCheckedSample,
  uploadLimit: number = DEFAULT_UPLOAD_LIMIT,
  publisher?: Pick<User, "status" | "superAdmin">,
): PublishBlocker[] {
  const blockers = unmet(fieldRequirements(sample));

  if (sample.parents?.some((parent) => parent === null)) {
    blockers.push("parent_not_found");
  }

  blockers.push(...unmet(attachmentRequirements(sample)));

  if (sample.attachments != null && sample.attachments.length > uploadLimit) {
    blockers.push("attachment_limit_exceeded");
  }

  if (publisher && !canPublishSamples(publisher)) {
    blockers.push("user_not_verified");
  }

  return [...new Set(blockers)];
}
