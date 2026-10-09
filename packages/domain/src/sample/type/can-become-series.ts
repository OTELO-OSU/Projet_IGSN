import type { Sample } from "../sample.ts";

export function canBecomeSeries(sample: {
  parents: readonly unknown[];
  hasSubSamples: Sample["hasSubSamples"];
}): boolean {
  return sample.parents.length === 0 && !sample.hasSubSamples;
}
