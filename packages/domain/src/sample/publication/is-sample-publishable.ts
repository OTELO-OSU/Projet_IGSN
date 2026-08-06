import type { User } from "../../user/model.ts";
import type { Sample } from "../sample.ts";

import { samplePublishBlockers } from "./sample-publish-blockers.ts";

// True when nothing blocks publication. Enforced at the publish boundary in
// `api`; the specific blockers come from `samplePublishBlockers`.
export function isSamplePublishable(
  sample: Sample,
  uploadLimit?: number,
  publisher?: Pick<User, "status" | "superAdmin">,
): boolean {
  return samplePublishBlockers(sample, uploadLimit, publisher).length === 0;
}
