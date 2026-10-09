import type { SampleStatus, SynchronizationStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { hasPermanentIgsn } from "../sample/publication/has-permanent-igsn.ts";
import { isPublicationQueued } from "../sample/publication/is-publication-queued.ts";
import { isSampleEditor } from "./is-sample-editor.ts";

export function canUpdateSample(
  role: UserSampleRole | null,
  sample: {
    status: SampleStatus;
    synchronizationStatus: SynchronizationStatus | null;
  },
): boolean {
  return (
    sample.status !== "tombstone" &&
    !isPublicationQueued(sample) &&
    (isSampleEditor(role) ||
      (role === "contributor" && !hasPermanentIgsn(sample)))
  );
}
