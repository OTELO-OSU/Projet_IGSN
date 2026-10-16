import type { PublishableFields } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";

import type { AttachmentMetadata } from "#/samples/attachment-metadata.ts";
import type { SampleDraft } from "#/samples/sample-draft-schema.ts";

import { toAgeInput } from "#/samples/age-form.ts";
import { composeDescription } from "#/samples/compose-description.ts";
import { composeLocation } from "#/samples/compose-location.ts";
import { composeMineralClassifications } from "#/samples/compose-mineral-classifications.ts";
import { composeProcessSteps } from "#/samples/compose-process-steps.ts";
import { composeScientificContext } from "#/samples/compose-scientific-context.ts";
import { composeSyntheticDetails } from "#/samples/compose-synthetic-details.ts";

export type SamplePublishInput = PublishableFields & {
  attachments: AttachmentMetadata[];
};

export function samplePublishInput(
  values: SampleDraft,
  attachments: AttachmentMetadata[],
): SamplePublishInput {
  const material = composeHierarchyValue(values.materialPath);
  return {
    nature: values.nature ?? null,
    type: composeHierarchyValue(values.typePath),
    material,
    location: composeLocation(values.location),
    description: composeDescription(values.description),
    age: toAgeInput(values.age),
    existenceStatus: values.existenceStatus ?? null,
    availabilityStatus: values.availabilityStatus ?? null,
    scientificContext: composeScientificContext(values.scientificContext),
    syntheticDetails: composeSyntheticDetails(
      values.syntheticDetails,
      material,
    ),
    relations: values.relations.map(({ targetResourceType }) => ({
      targetResourceType: targetResourceType || null,
    })),
    processSteps: composeProcessSteps(values.processSteps),
    mineralClassifications: composeMineralClassifications(
      values.mineralClassifications,
      material,
    ),
    parentIds: values.parentIds,
    attachments,
  } as SamplePublishInput;
}
