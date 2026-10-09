import type {
  SampleStatus,
  SynchronizationStatus,
} from "@projet-igsn/domain/sample/sample";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { isPublicationQueued } from "@projet-igsn/domain/sample/publication/is-publication-queued";

import { m } from "#/paraglide/messages.js";

const SYNCHRONIZATION_STATUS: Record<
  SynchronizationStatus,
  { className: string; label: () => string }
> = {
  pending: {
    className: "bg-blue-100 text-blue-800",
    label: m.sync_status_pending,
  },
  failed: {
    className: "bg-red-100 text-red-800",
    label: m.sync_status_failed,
  },
  synced: { className: "", label: m.sync_status_synced },
};

export function SynchronizationStatusBadge({
  sample,
}: {
  sample: {
    status: SampleStatus;
    synchronizationStatus: SynchronizationStatus | null;
  };
}) {
  if (sample.synchronizationStatus === null) return null;
  const { className, label } =
    SYNCHRONIZATION_STATUS[sample.synchronizationStatus];
  return (
    <Badge variant="secondary" className={className}>
      {isPublicationQueued(sample) ? m.sync_status_publishing() : label()}
    </Badge>
  );
}
