import type { SampleStatus, SynchronizationStatus } from "../sample.ts";

export function isPublicationQueued(sample: {
  status: SampleStatus;
  synchronizationStatus: SynchronizationStatus | null;
}): boolean {
  return (
    sample.status === "draft" && sample.synchronizationStatus === "pending"
  );
}
