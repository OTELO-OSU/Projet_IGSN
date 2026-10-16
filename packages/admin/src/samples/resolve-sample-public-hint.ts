import type { Sample, SampleStatus } from "@projet-igsn/domain/sample/sample";

import { formatDate } from "@projet-igsn/domain/date/format-date";

import { m } from "#/paraglide/messages.js";

const PUBLIC_HINT: Partial<
  Record<SampleStatus, (sample: Pick<Sample, "publishedAt">) => string>
> = {
  withdrawn: m.sample_withdrawn_hint,
  tombstone: m.sample_tombstone_hint,
  embargo: ({ publishedAt }) =>
    m.sample_embargo_hint({ date: publishedAt ? formatDate(publishedAt) : "" }),
};

export function resolveSamplePublicHint(
  sample: Pick<Sample, "status" | "publishedAt">,
): string | undefined {
  return PUBLIC_HINT[sample.status]?.(sample);
}
