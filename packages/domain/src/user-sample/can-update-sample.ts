import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { hasPermanentIgsn } from "../sample/publication/has-permanent-igsn.ts";
import { isSampleEditor } from "./is-sample-editor.ts";

export function canUpdateSample(
  role: UserSampleRole | null,
  sample: { status: SampleStatus },
): boolean {
  return (
    isSampleEditor(role) ||
    (role === "contributor" && !hasPermanentIgsn(sample))
  );
}
