import type { Sample } from "./sample.ts";

import { samplePublishBlockers } from "./sample-publish-blockers.ts";

// A sample can only be published once nothing blocks it (material set, in
// scope, and classified to a leaf). Enforced at the publish boundary in `api`.
// The specific blockers live in `samplePublishBlockers`.
export function isSamplePublishable(sample: Sample): boolean {
  return samplePublishBlockers(sample).length === 0;
}
