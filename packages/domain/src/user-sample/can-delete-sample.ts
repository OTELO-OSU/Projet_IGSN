import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { isSampleEditor } from "./is-sample-editor.ts";

export function canDeleteSample(
  role: UserSampleRole | null,
  sample: { status: SampleStatus },
): boolean {
  return sample.status === "draft" && isSampleEditor(role);
}
