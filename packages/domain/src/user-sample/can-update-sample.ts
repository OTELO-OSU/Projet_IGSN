import type { UserSampleRole } from "./model.ts";

import { isSampleEditor } from "./is-sample-editor.ts";

export function canUpdateSample(
  role: UserSampleRole | null,
  sample: { published: boolean },
): boolean {
  return isSampleEditor(role) || (role === "contributor" && !sample.published);
}
