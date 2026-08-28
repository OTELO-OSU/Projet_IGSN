import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";

import { m } from "#/paraglide/messages.js";

export const SAMPLE_STATUS: Record<
  SampleStatus,
  { className: string; label: () => string }
> = {
  draft: { className: "", label: m.status_draft },
  published: {
    className: "bg-green-100 text-green-800",
    label: m.status_published,
  },
  withdrawn: {
    className: "bg-amber-100 text-amber-800",
    label: m.status_withdrawn,
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
