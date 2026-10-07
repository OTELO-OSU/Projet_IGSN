import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";

import { m } from "#/paraglide/messages.js";

export const SAMPLE_STATUS: Record<
  SampleStatus,
  { className: string; label: () => string }
> = {
  draft: { className: "", label: m.status_draft },
  publishing: {
    className: "bg-blue-100 text-blue-800",
    label: m.status_publishing,
  },
  publish_failed: {
    className: "bg-red-100 text-red-800",
    label: m.status_publish_failed,
  },
  embargo: {
    className: "bg-sky-100 text-sky-800",
    label: m.status_embargo,
  },
  published: {
    className: "bg-green-100 text-green-800",
    label: m.status_published,
  },
  withdrawn: {
    className: "bg-amber-100 text-amber-800",
    label: m.status_withdrawn,
  },
  tombstone: {
    className: "bg-gray-200 text-gray-800",
    label: m.status_tombstone,
  },
};

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  const { className, label } = SAMPLE_STATUS[status];
  return (
    <Badge variant="secondary" className={className}>
      {label()}
    </Badge>
  );
}
