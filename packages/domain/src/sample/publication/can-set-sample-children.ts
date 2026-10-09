import type { Sample } from "../sample.ts";

import { hasPermanentIgsn } from "./has-permanent-igsn.ts";

export function canSetSampleChildren(sample: Pick<Sample, "status">): boolean {
  return hasPermanentIgsn(sample);
}
