import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { m } from "#/paraglide/messages.js";
import { copiedSampleFields } from "#/samples/copied-sample-fields.ts";

export const toDuplicateDefaults = (
  sample: Sample,
  attachableGroupIds: string[],
  parentIds: string[],
): Partial<CreateSample> => ({
  ...copiedSampleFields(sample),
  name: m.sample_copy_name({ name: sample.name }),
  nature: sample.nature,
  relations: sample.relations,
  attachments: [],
  manualGroupIds: sample.manualGroups
    .map(({ id }) => id)
    .filter((id) => attachableGroupIds.includes(id)),
  parentIds,
});
