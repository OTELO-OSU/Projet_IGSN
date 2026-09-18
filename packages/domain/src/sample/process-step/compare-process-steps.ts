import type { SampleProcessStep } from "./model.ts";

import { PROCESS_STEP_KINDS } from "./kind.ts";

function lastWhenMissing(
  a: string | null | undefined,
  b: string | null | undefined,
  compare: (a: string, b: string) => number,
): number {
  if (a == null || b == null) return Number(a == null) - Number(b == null);
  return compare(a, b);
}

const newestFirst = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

export function compareProcessSteps(
  a: SampleProcessStep,
  b: SampleProcessStep,
): number {
  return (
    PROCESS_STEP_KINDS.indexOf(a.kind) - PROCESS_STEP_KINDS.indexOf(b.kind) ||
    lastWhenMissing(a.date?.start, b.date?.start, newestFirst) ||
    lastWhenMissing(a.date?.end, b.date?.end, newestFirst) ||
    lastWhenMissing(a.description, b.description, (first, second) =>
      first.localeCompare(second),
    )
  );
}
