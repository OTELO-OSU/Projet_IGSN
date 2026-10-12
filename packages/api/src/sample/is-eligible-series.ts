import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

import { PUBLIC_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";

export function isEligibleSeries(candidate: SeriesLinkCandidate): boolean {
  return (
    isVirtualSample(candidate.type) &&
    (PUBLIC_SAMPLE_STATUSES as readonly SampleStatus[]).includes(
      candidate.status,
    )
  );
}
