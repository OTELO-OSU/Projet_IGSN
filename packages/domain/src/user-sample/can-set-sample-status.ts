import type { SetSampleStatusBody } from "../sample/sample-validator.ts";
import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { hasPermanentIgsn } from "../sample/publication/has-permanent-igsn.ts";
import { isSampleEditor } from "./is-sample-editor.ts";

export function canSetSampleStatus(
  role: UserSampleRole | null,
  managed: boolean,
  sample: { status: SampleStatus },
  to: SetSampleStatusBody["status"],
): boolean {
  if (!hasPermanentIgsn(sample)) return false;
  if (to === "embargo") {
    return sample.status === "embargo" && isSampleEditor(role);
  }
  if (sample.status === "embargo" && to === "withdrawn") return false;
  return sample.status === "tombstone" || to === "tombstone"
    ? managed
    : isSampleEditor(role);
}
