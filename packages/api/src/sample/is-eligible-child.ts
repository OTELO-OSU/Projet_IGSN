import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

import { PUBLIC_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";

export function isEligibleChild(
  child: SeriesLinkCandidate,
  seriesId?: string,
): boolean {
  return (
    (PUBLIC_SAMPLE_STATUSES as readonly SampleStatus[]).includes(
      child.status,
    ) &&
    !child.isSubSample &&
    !isVirtualSample(child.type) &&
    child.id !== seriesId &&
    child.seriesId === null
  );
}
