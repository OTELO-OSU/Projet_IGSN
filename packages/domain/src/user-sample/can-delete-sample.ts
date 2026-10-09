import type { SampleStatus, SynchronizationStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { isSampleEditor } from "./is-sample-editor.ts";

export function canDeleteSample(
  role: UserSampleRole | null,
  sample: {
    status: SampleStatus;
    synchronizationStatus: SynchronizationStatus | null;
  },
): boolean {
  return (
    sample.status === "draft" &&
    sample.synchronizationStatus === null &&
    isSampleEditor(role)
  );
}
