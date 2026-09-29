import type { SampleStatus } from "../sample.ts";

// ADR 0032: a sample that left draft keeps its IGSN forever, withdrawn or not.
export const PERMANENT_IGSN_STATUSES = [
  "published",
  "withdrawn",
  "tombstone",
] as const satisfies SampleStatus[];

export function hasPermanentIgsn(sample: { status: SampleStatus }): boolean {
  return (PERMANENT_IGSN_STATUSES as readonly SampleStatus[]).includes(
    sample.status,
  );
}
