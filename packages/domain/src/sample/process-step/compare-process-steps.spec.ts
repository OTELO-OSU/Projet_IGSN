import { describe, expect, it } from "vitest";

import type { SampleProcessStep } from "./model.ts";

import { compareProcessSteps } from "./compare-process-steps.ts";

const day = (start: string, end: string = start) => ({
  precision: "day" as const,
  start,
  end,
});

const step = (
  kind: SampleProcessStep["kind"],
  date: SampleProcessStep["date"] = null,
  description: string | null = null,
): SampleProcessStep => ({ kind, date, description });

describe("compareProcessSteps", () => {
  it.each([
    {
      rule: "the kinds in declaration order rather than alphabetically",
      steps: [
        step("other", day("2024-01-01")),
        step("preservation"),
        step("derivation"),
        step("transformation"),
        step("subsampling", day("2020-01-01")),
        step("preparation"),
      ],
      sorted: [
        step("subsampling", day("2020-01-01")),
        step("derivation"),
        step("preparation"),
        step("transformation"),
        step("preservation"),
        step("other", day("2024-01-01")),
      ],
    },
    {
      rule: "the newest date first inside a kind",
      steps: [
        step("preparation", day("2024-06-05")),
        step("preparation", day("2025-01-10")),
      ],
      sorted: [
        step("preparation", day("2025-01-10")),
        step("preparation", day("2024-06-05")),
      ],
    },
    {
      rule: "the latest end date first when the start dates tie",
      steps: [
        step("preparation", day("2024-06-05", "2024-06-06")),
        step("preparation", day("2024-06-05", "2024-06-30")),
      ],
      sorted: [
        step("preparation", day("2024-06-05", "2024-06-30")),
        step("preparation", day("2024-06-05", "2024-06-06")),
      ],
    },
    {
      rule: "an undated step after a dated one of the same kind",
      steps: [step("preparation"), step("preparation", day("2024-06-05"))],
      sorted: [step("preparation", day("2024-06-05")), step("preparation")],
    },
    {
      rule: "the descriptions ascending when the dates tie",
      steps: [
        step("derivation", day("2024-06-05"), "Sawn into three slabs"),
        step("derivation", day("2024-06-05"), "Broken with a hammer"),
      ],
      sorted: [
        step("derivation", day("2024-06-05"), "Broken with a hammer"),
        step("derivation", day("2024-06-05"), "Sawn into three slabs"),
      ],
    },
    {
      rule: "a step without description last",
      steps: [
        step("derivation", day("2024-06-05")),
        step("derivation", day("2024-06-05"), "Broken with a hammer"),
      ],
      sorted: [
        step("derivation", day("2024-06-05"), "Broken with a hammer"),
        step("derivation", day("2024-06-05")),
      ],
    },
  ])("should order $rule", ({ steps, sorted }) => {
    expect(steps.toSorted(compareProcessSteps)).toEqual(sorted);
  });
});
