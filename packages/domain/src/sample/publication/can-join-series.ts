import type { Sample, SampleStatus } from "../sample.ts";

import { isVirtualSample } from "../type/is-virtual-sample.ts";
import { PUBLIC_SAMPLE_STATUSES } from "./public-sample-statuses.ts";

export function canJoinSeries(
  sample: Pick<Sample, "status" | "type" | "parents">,
): boolean {
  return (
    (PUBLIC_SAMPLE_STATUSES as readonly SampleStatus[]).includes(
      sample.status,
    ) &&
    sample.parents.length === 0 &&
    !isVirtualSample(sample.type)
  );
}
