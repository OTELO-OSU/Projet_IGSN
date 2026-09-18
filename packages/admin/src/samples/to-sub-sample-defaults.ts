import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { inheritedCollectionDate } from "@projet-igsn/domain/sample/parent/inherited-collection-date";
import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { SYNTHETIC_MATERIAL_ROOT } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";

import { copiedSampleFields } from "#/samples/copied-sample-fields.ts";

export const toSubSampleDefaults = (
  parents: Sample[],
): Partial<CreateSample> => {
  const parent = soleParent(parents);
  if (parent === undefined) {
    return {
      material: SYNTHETIC_MATERIAL_ROOT,
      parentIds: parents.map(({ id }) => id),
      description: {
        collectionDate: inheritedCollectionDate(
          parents.map(({ description }) => description?.collectionDate),
        ),
      },
    };
  }
  return {
    ...copiedSampleFields(parent),
    relations: [],
    processSteps: [],
    attachments: [],
    manualGroupIds: [],
    parentIds: [parent.id],
  };
};
