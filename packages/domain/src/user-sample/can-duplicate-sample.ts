import type { SampleStatus } from "../sample/sample.ts";

export function canDuplicateSample(sample: { status: SampleStatus }): boolean {
  switch (sample.status) {
    case "draft":
    case "published":
    case "withdrawn":
      return true;
    case "tombstone":
      return false;
  }
}
