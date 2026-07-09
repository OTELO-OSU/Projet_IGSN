import type { Sample } from "../sample.ts";

import { samplePublishBlockers } from "./sample-publish-blockers.ts";

// True when nothing blocks publication. Enforced at the publish boundary in
// `api`; the specific blockers come from `samplePublishBlockers`.
export function isSamplePublishable(sample: Sample): boolean {
  return samplePublishBlockers(sample).length === 0;
}
