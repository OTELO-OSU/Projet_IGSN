import type { SampleStatus } from "../sample.ts";

// ADR 0032: a sample that left draft keeps its IGSN forever, withdrawn or not.
export function hasPermanentIgsn(sample: { status: SampleStatus }): boolean {
  return sample.status !== "draft";
}
